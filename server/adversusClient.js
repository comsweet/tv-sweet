import axios from 'axios';
import { startOfMonth, subDays, format } from 'date-fns';

const adversusApi = axios.create({
  baseURL: process.env.ADVERSUS_API_URL || 'https://api.adversus.dk/api',
  headers: {
    'Authorization': `Bearer ${process.env.ADVERSUS_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Get date range for lead fetching
 * Returns: Current month start - 7 days to now
 */
function getLeadDateRange() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const startDate = subDays(monthStart, 7);

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(now, 'yyyy-MM-dd')
  };
}

/**
 * Fetch user details including group information
 * @param {number} userId - User ID (must be number per Adversus standard)
 */
export async function fetchUser(userId) {
  try {
    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
      throw new Error('userId must be a number');
    }

    const response = await adversusApi.get(`/users/${userIdNum}`);
    return {
      userId: Number(response.data.id), // Always convert to number
      name: response.data.name,
      email: response.data.email,
      groupId: response.data.group?.id ? Number(response.data.group.id) : null,
      groupName: response.data.group?.name || null
    };
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch all users from Adversus
 */
export async function fetchAllUsers() {
  try {
    const response = await adversusApi.get('/users');
    return response.data.map(user => ({
      userId: Number(user.id), // Always convert to number
      name: user.name,
      email: user.email,
      groupId: user.group?.id ? Number(user.group.id) : null,
      groupName: user.group?.name || null
    }));
  } catch (error) {
    console.error('Error fetching users:', error.message);
    throw error;
  }
}

/**
 * Fetch SUCCESS leads from current month + 7 days
 * Only fetches leads with status "success" to reduce server load
 * @param {Object} options - Filter options
 * @param {number} options.userId - Filter by specific user ID
 * @param {number} options.groupId - Filter by group ID
 * @param {string} options.startDate - Custom start date (yyyy-MM-dd)
 * @param {string} options.endDate - Custom end date (yyyy-MM-dd)
 */
export async function fetchSuccessLeads(options = {}) {
  try {
    const { startDate, endDate } = options.startDate && options.endDate
      ? { startDate: options.startDate, endDate: options.endDate }
      : getLeadDateRange();

    const params = {
      status: 'success',
      from: startDate,
      to: endDate,
      ...options
    };

    // Remove custom date params from API call
    delete params.startDate;
    delete params.endDate;

    console.log(`Fetching success leads from ${startDate} to ${endDate}`);

    const response = await adversusApi.get('/v1/leads/', { params });

    // Transform leads data
    const leads = response.data.map(lead => ({
      id: lead.id,
      userId: Number(lead.userId || lead.user_id), // Always convert to number
      userName: lead.userName || lead.user_name,
      status: lead.status,
      commission: parseFloat(lead.commission || 0),
      campaign: lead.campaign,
      campaignId: lead.campaignId || lead.campaign_id,
      createdAt: lead.createdAt || lead.created_at,
      smsCount: parseInt(lead.smsCount || lead.sms_count || 0),
      phoneNumber: lead.phoneNumber || lead.phone_number
    }));

    console.log(`Fetched ${leads.length} success leads`);
    return leads;
  } catch (error) {
    console.error('Error fetching leads:', error.message);
    throw error;
  }
}

/**
 * Calculate leaderboard statistics for agents
 * @param {Array} leads - Array of success leads
 * @param {Array} agents - Array of agent data with bonus assignments
 */
export function calculateLeaderboardStats(leads, agents) {
  const agentStats = {};

  // Initialize stats for all agents
  agents.forEach(agent => {
    agentStats[agent.userId] = {
      userId: Number(agent.userId), // Always ensure number
      name: agent.name,
      profileImageUrl: agent.profileImageUrl,
      personalSoundUrl: agent.personalSoundUrl,
      deals: 0,
      commission: 0,
      bonus: 0,
      smsSent: 0,
      smsSuccessRate: 0,
      campaignDeals: {}, // Track deals per campaign for bonus calculation
      totalEarnings: 0
    };
  });

  // Process leads
  leads.forEach(lead => {
    const userId = Number(lead.userId);
    if (!agentStats[userId]) return;

    const stats = agentStats[userId];
    stats.deals++;
    stats.commission += lead.commission;
    stats.smsSent += lead.smsCount;

    // Track deals per campaign for bonus calculation
    if (lead.campaign) {
      stats.campaignDeals[lead.campaign] = (stats.campaignDeals[lead.campaign] || 0) + 1;
    }
  });

  // Calculate SMS success rate and bonuses
  Object.values(agentStats).forEach(stats => {
    // SMS success rate = deals / SMS sent
    stats.smsSuccessRate = stats.smsSent > 0
      ? Math.round((stats.deals / stats.smsSent) * 100)
      : 0;

    // Calculate bonus for each campaign
    const agent = agents.find(a => Number(a.userId) === stats.userId);
    if (agent && agent.bonusAssignments) {
      agent.bonusAssignments.forEach(assignment => {
        const campaignDeals = stats.campaignDeals[assignment.campaignName] || 0;
        if (campaignDeals > 0 && assignment.bonusTiers) {
          // Find the highest applicable bonus tier
          const applicableTiers = assignment.bonusTiers
            .filter(tier => campaignDeals >= tier.dealsRequired)
            .sort((a, b) => b.dealsRequired - a.dealsRequired);

          if (applicableTiers.length > 0) {
            const tier = applicableTiers[0];
            stats.bonus += campaignDeals * tier.bonusPerDeal;
          }
        }
      });
    }

    // Total earnings
    stats.totalEarnings = stats.commission + stats.bonus;
  });

  return Object.values(agentStats).sort((a, b) => b.totalEarnings - a.totalEarnings);
}

/**
 * Get color based on earnings and time period
 * @param {number} earnings - Total earnings (commission + bonus)
 * @param {string} timePeriod - Time period (day, week, month)
 */
export function getEarningsColor(earnings, timePeriod) {
  if (timePeriod === 'day') {
    if (earnings === 0) return 'red';
    if (earnings < 3400) return 'orange';
    return 'green';
  }

  // For week and month
  if (earnings === 0) return 'red';
  if (earnings < 50000) return 'black';
  return 'green';
}

export default adversusApi;
