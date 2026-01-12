// Mock data for candidate profile page
export const candidateProfileData = {
  1: {
    id: 1,
    name: 'Sabahat Zahra',
    email: 'sabahatamin73@gmail.com',
    cv: {
      url: '/path/to/cv.pdf', // This would be a real URL in production
      available: true
    },
    resumeEvaluation: {
      url: '/path/to/resume-evaluation.pdf',
      available: true
    },
    aiInterview: {
      report: '/path/to/ai-interview-report.pdf',
      available: false,
      status: 'not_started'
    },
    resumeScore: {
      recencyScore: 85,
      relevanceScore: 78,
      skillMatch: 82,
      experienceScore: 75,
      softSkills: 88,
      finalScore: 81
    }
  },
  2: {
    id: 2,
    name: 'Sarah Faisal',
    email: 'sf0849@st.habib.edu.pk',
    cv: {
      url: '/path/to/cv.pdf',
      available: true
    },
    resumeEvaluation: {
      url: '/path/to/resume-evaluation.pdf',
      available: true
    },
    aiInterview: {
      report: '/path/to/ai-interview-report.pdf',
      available: true,
      status: 'completed'
    },
    resumeScore: {
      recencyScore: 80,
      relevanceScore: 72,
      skillMatch: 75,
      experienceScore: 70,
      softSkills: 85,
      finalScore: 76
    }
  },
  3: {
    id: 3,
    name: 'Sarah Faisal',
    email: 'faisalsara124@gmail.com',
    cv: {
      url: '/path/to/cv.pdf',
      available: true
    },
    resumeEvaluation: {
      url: '/path/to/resume-evaluation.pdf',
      available: true
    },
    aiInterview: {
      report: null,
      available: false,
      status: 'not_started'
    },
    resumeScore: {
      recencyScore: 45,
      relevanceScore: 38,
      skillMatch: 42,
      experienceScore: 30,
      softSkills: 55,
      finalScore: 42
    }
  },
  4: {
    id: 4,
    name: 'P',
    email: 'p@example.com',
    cv: {
      url: '/path/to/cv.pdf',
      available: true
    },
    resumeEvaluation: {
      url: '/path/to/resume-evaluation.pdf',
      available: false
    },
    aiInterview: {
      report: null,
      available: false,
      status: 'not_started'
    },
    resumeScore: {
      recencyScore: 25,
      relevanceScore: 20,
      skillMatch: 28,
      experienceScore: 15,
      softSkills: 40,
      finalScore: 26
    }
  }
};
