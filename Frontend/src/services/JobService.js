import { apiFetch } from './AuthService';

export const jobService = {
  // Segment job description text using AI
  async segmentJobDescription(jdText) {
    try {
      const res = await apiFetch('/api/SegmentJobDescription', {
        method: 'POST',
        body: JSON.stringify({ jd_text: jdText })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to segment job description');
      }

      const data = await res.json();
      return data.segmented_jd;
    } catch (error) {
      console.error('JobService.segmentJobDescription error:', error);
      throw error;
    }
  },

  // Create a new job posting
  async createJob(jobData) {
    try {
      const formData = new FormData();
      formData.append('JobTitle', jobData.JobTitle);
      formData.append('CompanyName', jobData.CompanyName);
      formData.append('JobDescription', jobData.JobDescription);
      formData.append('OwnerEmail', jobData.OwnerEmail);

      // Add evaluation criteria
      if (jobData.NonNegotiable) {
        formData.append('NonNegotiable', Array.isArray(jobData.NonNegotiable)
          ? jobData.NonNegotiable.join(',')
          : jobData.NonNegotiable);
      }
      if (jobData.Additional) {
        formData.append('Additional', Array.isArray(jobData.Additional)
          ? jobData.Additional.join(',')
          : jobData.Additional);
      }

      // Auto-segment JD if requested
      if (jobData.AutoSegmentJD) {
        formData.append('AutoSegmentJD', 'true');
      }

      // Add candidate emails if provided
      if (jobData.candidateEmails) {
        formData.append('candidateEmails', jobData.candidateEmails);
      }

      // Add CV files if provided
      if (jobData.cvFiles && jobData.cvFiles.length > 0) {
        jobData.cvFiles.forEach(file => {
          formData.append('cvs', file);
        });
      }

      const res = await apiFetch('/api/CreateJob', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create job');
      }

      const data = await res.json();
      return {
        success: true,
        jobId: data.job.JobID,
        job: data.job,
        message: data.message
      };
    } catch (error) {
      console.error('JobService.createJob error:', error);
      throw error;
    }
  },

  // Get job details
  async getJob(jobId) {
    try {
      const res = await apiFetch('/api/JobIntrinsics', {
        method: 'POST',
        body: JSON.stringify({ JobID: jobId })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch job');
      }

      return await res.json();
    } catch (error) {
      console.error('JobService.getJob error:', error);
      throw error;
    }
  },

  // Upload additional candidates to existing job (async, returns 202)
  async uploadCandidates(data) {
    try {
      const formData = new FormData();
      formData.append('JobID', data.jobId);

      if (data.candidateEmails) {
        formData.append('candidateEmails', data.candidateEmails);
      }

      if (data.files && data.files.length > 0) {
        data.files.forEach(file => {
          formData.append('cvs', file);
        });
      }

      const res = await apiFetch('/api/AddResumes', {
        method: 'POST',
        body: formData,
        headers: {}
      });

      // Handle both 200 (sync) and 202 (async) responses
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to upload candidates');
      }

      const result = await res.json();
      return {
        success: true,
        message: result.message,
        candidatesProcessed: result.Added || 0,
        isAsync: res.status === 202,
        note: result.note || null,
        evaluationJobIds: result.evaluationJobIds || []
      };
    } catch (error) {
      console.error('JobService.uploadCandidates error:', error);
      throw error;
    }
  },

  // Get updated candidates for a job (for checking evaluation progress)
  async getJobCandidates(jobId) {
    try {
      const res = await apiFetch('/api/GetJobCandidates', {
        method: 'POST',
        body: JSON.stringify({ JobID: jobId })
      });

      if (!res.ok) {
        throw new Error('Failed to fetch candidates');
      }

      const result = await res.json();
      return {
        totalCandidates: result.totalCandidates,
        candidates: result.Candidates || []
      };
    } catch (error) {
      console.error('JobService.getJobCandidates error:', error);
      throw error;
    }
  },

  // Get job link for candidates (already exists in job data)
  async generateCandidateLink(data) {
    try {
      const job = await this.getJob(data.jobId);
      return {
        success: true,
        link: job.JobLink || `${window.location.origin}/candidate-drop-cv?jobId=${data.jobId}`,
        expiresAt: null // No expiry for now
      };
    } catch (error) {
      console.error('JobService.generateCandidateLink error:', error);
      throw error;
    }
  }
};