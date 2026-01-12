// Mock data matching expected API response structure
export const mockDashboardStats = {
  activeJobs: 1,
  totalAppliedCandidates: 0,
  shortlistedCandidates: 0,
  interviewsScheduled: 0
};

export const mockJobs = [
  {
    id: "job_1",
    title: "Folio3",
    position: "Data Engineer",
    status: "active",
    candidatesCount: 0,
    createdAt: "2025-01-15T10:30:00Z"
  }
  // More jobs will be added as they're created
];

// Combined dashboard data for the service
export const dashboardData = {
  stats: {
    activeJobs: mockDashboardStats.activeJobs,
    totalCandidates: mockDashboardStats.totalAppliedCandidates,
    shortlisted: mockDashboardStats.shortlistedCandidates,
    interviewsScheduled: mockDashboardStats.interviewsScheduled
  },
  jobs: mockJobs
};