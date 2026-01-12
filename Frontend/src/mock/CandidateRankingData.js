// Mock data for candidate ranking page
export const candidateRankingData = {
  job: {
    id: 'job_1',
    title: 'Data Engineer',
    company: 'Folio3'
  },
  stats: {
    totalCandidates: 10,
    interviewInvitesSent: 0,
    interviewsScheduled: 0,
    interviewsPending: 0,
    interviewsCompleted: 0
  },
  candidates: [
    {
      id: 1,
      rank: 1,
      initials: 'SZ',
      name: 'Sabahat Zahra',
      email: 'sabahatamin73@gmail.com',
      experience: [
        { 
          title: 'Full Stack Developer Trainee', 
          company: 'Blutech Consulting', 
          duration: '1 month' 
        },
        { 
          title: 'Web Developer Intern', 
          company: 'TechCorp', 
          duration: '3 months' 
        }
      ],
      matchScore: 31,
      nonNegotiableMatch: [true, false, true, true, false],
      status: 'Applied',
      statusColor: 'gray'
    },
    {
      id: 2,
      rank: 2,
      initials: 'SF',
      name: 'Sarah Faisal',
      email: 'sf0849@st.habib.edu.pk',
      experience: [
        { 
          title: 'QA Intern', 
          company: '10Pearls', 
          duration: '10 months' 
        },
        { 
          title: 'Testing Trainee', 
          company: 'SoftTest Inc', 
          duration: '2 months' 
        }
      ],
      matchScore: 29,
      nonNegotiableMatch: [false, false, true, true, false],
      status: 'Complete',
      statusColor: 'green'
    },
    {
      id: 3,
      rank: 3,
      initials: 'SF',
      name: 'Sarah Faisal',
      email: 'faisalsara124@gmail.com',
      experience: [],
      experienceText: 'No relevant experience',
      matchScore: 16,
      nonNegotiableMatch: [true, false, false, false, false],
      status: 'Applied',
      statusColor: 'gray'
    },
    {
      id: 4,
      rank: 4,
      initials: 'P',
      name: 'P',
      email: 'p@example.com',
      experience: [],
      experienceText: 'No relevant experience',
      matchScore: 5,
      nonNegotiableMatch: [false, false, false, false, false],
      status: 'Applied',
      statusColor: 'gray'
    }
  ]
};