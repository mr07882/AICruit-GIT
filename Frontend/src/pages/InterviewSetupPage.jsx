import React, { useState, useEffect, useRef } from 'react';
import { Video, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


const InterviewSetupPage = () => {
  const navigate = useNavigate();

  // device lists
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [speakers, setSpeakers] = useState([]);

  // selected device ids
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedMicId, setSelectedMicId] = useState('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');

  // mic level and test state
  const [micLevel, setMicLevel] = useState(0);
  const [micPermission, setMicPermission] = useState(null); // null = unknown, false = denied, true = granted
  const [cameraPermission, setCameraPermission] = useState(null);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);

  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);
  const testAudioRef = useRef(null);

  // helper: stop tracks and audio context
  const cleanupStreams = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (analyserRef.current) analyserRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    analyserRef.current = null;
    sourceRef.current = null;
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // enumerate devices (and request permissions to get labels if necessary)
  const enumerate = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === 'videoinput');
      const mics = devices.filter(d => d.kind === 'audioinput');
      const spk = devices.filter(d => d.kind === 'audiooutput');
      setCameras(cams);
      setMicrophones(mics);
      setSpeakers(spk);

      // pick defaults if not already set
      if (!selectedCameraId && cams[0]) setSelectedCameraId(cams[0].deviceId);
      if (!selectedMicId && mics[0]) setSelectedMicId(mics[0].deviceId);
      if (!selectedSpeakerId && spk[0]) setSelectedSpeakerId(spk[0].deviceId);
    } catch (err) {
      console.error('Error enumerating devices', err);
    }
  };

  // request permissions up-front so labels are available
  const requestPermissions = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMicPermission(true);
      setCameraPermission(true);
      // stop immediately - we only wanted permission/labels
      s.getTracks().forEach(t => t.stop());
    } catch (err) {
      console.warn('Permission denied or unavailable', err);
      // try to detect which permission
      setMicPermission(false);
      setCameraPermission(false);
    } finally {
      await enumerate();
    }
  };

  useEffect(() => {
    requestPermissions();
    return () => cleanupStreams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // start camera preview for selected camera
  const startCameraPreview = async (deviceId) => {
    try {
      // stop previous streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }

      const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch (e) {}
      }
    } catch (err) {
      console.error('Unable to start camera preview', err);
    }
  };

  // start mic analyser for selected mic
  const startMicMonitor = async (deviceId) => {
    try {
      if (audioCtxRef.current) {
        // recreate to ensure using new device
        cleanupStreams();
      }

      const constraints = { audio: deviceId ? { deviceId: { exact: deviceId } } : true, video: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream; // store for cleanup (also contains mic track)

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current.connect(analyserRef.current);

      const data = new Uint8Array(analyserRef.current.frequencyBinCount);

      const tick = () => {
        analyserRef.current.getByteTimeDomainData(data);
        // compute RMS
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const level = Math.min(100, Math.max(0, Math.round(rms * 200)));
        setMicLevel(level);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setMicPermission(true);
    } catch (err) {
      console.error('Mic monitor failed', err);
      setMicPermission(false);
    }
  };

  // handle device selection changes
  useEffect(() => {
    if (selectedCameraId) startCameraPreview(selectedCameraId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCameraId]);

  useEffect(() => {
    if (selectedMicId) startMicMonitor(selectedMicId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMicId]);

  // Speaker test: create short beep or play audio element, try setSinkId
  const handleTestSpeaker = async () => {
    if (!selectedSpeakerId) {
      alert('No speaker selected');
      return;
    }
    setIsTestingSpeaker(true);
    try {
      // create a short beep using AudioContext connected to an audio element to allow setSinkId
      // Fallback: use oscillator directly
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.1;
      oscillator.connect(gain);

      // Create destination that can be routed to HTMLAudioElement if setSinkId is desired
      let dest = null;
      if (typeof ctx.createMediaStreamDestination === 'function') {
        dest = ctx.createMediaStreamDestination();
        gain.connect(dest);
      } else {
        gain.connect(ctx.destination);
      }

      oscillator.start();

      if (dest && testAudioRef.current && typeof testAudioRef.current.setSinkId === 'function') {
        testAudioRef.current.srcObject = dest.stream;
        try {
          await testAudioRef.current.setSinkId(selectedSpeakerId);
        } catch (err) {
          console.warn('setSinkId failed or not permitted', err);
        }
        try { await testAudioRef.current.play(); } catch (e) {}
      }

      // stop after 700ms
      setTimeout(async () => {
        try { oscillator.stop(); } catch (e) {}
        try { ctx.close(); } catch (e) {}
        setIsTestingSpeaker(false);
      }, 700);
    } catch (err) {
      console.error('Speaker test failed', err);
      setIsTestingSpeaker(false);
      alert('Speaker test failed: ' + (err && err.message ? err.message : 'unknown'));
    }
  };

  const handleClose = () => {
    cleanupStreams();
    navigate('/dashboard');
  };

  const handleContinue = () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('jobId');
    const email = params.get('email');
    const q = [];
    if (jobId) q.push(`jobId=${encodeURIComponent(jobId)}`);
    if (email) q.push(`email=${encodeURIComponent(email)}`);
    if (selectedCameraId) q.push(`cameraId=${encodeURIComponent(selectedCameraId)}`);
    if (selectedMicId) q.push(`micId=${encodeURIComponent(selectedMicId)}`);
    if (selectedSpeakerId) q.push(`speakerId=${encodeURIComponent(selectedSpeakerId)}`);
    const qs = q.length ? `?${q.join('&')}` : '';
    navigate(`/interview${qs}`);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">Interview Setup</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {/* Camera Preview */}
          <div className="mb-6">
            <div className="w-full h-64 bg-black rounded-lg flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ backgroundColor: '#111' }}
              />
              {!cameraPermission && (
                <div className="absolute text-white bg-black/50 px-4 py-2 rounded">Camera access required</div>
              )}
            </div>
          </div>

          {/* Camera Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Camera
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
            >
              {cameras.length === 0 && <option value="">No camera found</option>}
              {cameras.map((camera) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${camera.deviceId}`}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Microphone
            </label>
            <select
              value={selectedMicId}
              onChange={(e) => setSelectedMicId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer mb-3"
            >
              {microphones.length === 0 && <option value="">No microphone found</option>}
              {microphones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Mic ${mic.deviceId}`}
                </option>
              ))}
            </select>

            {/* Mic Level Indicator */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                Mic Level
              </span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-100 rounded-full"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              <button
                onClick={() => startMicMonitor(selectedMicId)}
                className="px-3 py-1 bg-blue-50 text-blue-600 rounded ml-2 text-sm"
              >
                Restart Mic
              </button>
            </div>
          </div>

          {/* Speaker Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Speaker
            </label>
            <select
              value={selectedSpeakerId}
              onChange={(e) => setSelectedSpeakerId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer mb-3"
            >
              {speakers.length === 0 && <option value="">No speaker found</option>}
              {speakers.map((speaker) => (
                <option key={speaker.deviceId} value={speaker.deviceId}>
                  {speaker.label || `Speaker ${speaker.deviceId}`}
                </option>
              ))}
            </select>

            {/* Test Speaker Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestSpeaker}
                className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                disabled={isTestingSpeaker}
              >
                <Volume2 className="w-4 h-4" />
                {isTestingSpeaker ? 'Playing...' : 'Test Speaker'}
              </button>
              <audio ref={testAudioRef} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Close
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/30 transition-all duration-200"
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* Desktop/Primary Label */}
      <div className="fixed top-4 left-4 text-xs text-gray-500 font-mono">
        Desktop · Primary
      </div>
    </div>
  );
};

export default InterviewSetupPage;