import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { format } from 'date-fns';
import {
  agentQueries,
  leaderboardQueries,
  bonusTierQueries,
  agentBonusQueries,
  slideshowQueries,
  normalizeUserId
} from './database.js';
import {
  fetchUser,
  fetchAllUsers,
  fetchSuccessLeads,
  calculateLeaderboardStats,
  getEarningsColor
} from './adversusClient.js';
import {
  uploadProfileImage,
  uploadSoundFile
} from './cloudinaryClient.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ============================================================================
// AGENT ROUTES
// ============================================================================

// Get all agents
app.get('/api/agents', (req, res) => {
  try {
    const agents = agentQueries.getAll.all();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent by ID
app.get('/api/agents/:userId', (req, res) => {
  try {
    const userId = normalizeUserId(req.params.userId);
    const agent = agentQueries.getById.get(userId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync agent from Adversus
app.post('/api/agents/sync/:userId', async (req, res) => {
  try {
    const userId = normalizeUserId(req.params.userId);
    const userData = await fetchUser(userId);

    agentQueries.upsert.run({
      userId: userData.userId,
      name: userData.name,
      email: userData.email,
      groupId: userData.groupId,
      profileImageUrl: null,
      personalSoundUrl: null
    });

    const agent = agentQueries.getById.get(userId);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync all agents from Adversus
app.post('/api/agents/sync-all', async (req, res) => {
  try {
    const users = await fetchAllUsers();
    let syncedCount = 0;

    for (const user of users) {
      agentQueries.upsert.run({
        userId: user.userId,
        name: user.name,
        email: user.email,
        groupId: user.groupId,
        profileImageUrl: null,
        personalSoundUrl: null
      });
      syncedCount++;
    }

    res.json({ message: `Synced ${syncedCount} agents`, count: syncedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload profile image
app.post('/api/agents/:userId/profile-image', upload.single('image'), async (req, res) => {
  try {
    const userId = normalizeUserId(req.params.userId);

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload to Cloudinary
    const imageUrl = await uploadProfileImage(req.file.buffer, userId);

    // Update database
    agentQueries.updateProfileImage.run(imageUrl, userId);

    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload personal sound
app.post('/api/agents/:userId/personal-sound', upload.single('sound'), async (req, res) => {
  try {
    const userId = normalizeUserId(req.params.userId);

    if (!req.file) {
      return res.status(400).json({ error: 'No sound file provided' });
    }

    // Upload to Cloudinary
    const soundUrl = await uploadSoundFile(req.file.buffer, 'personal', userId);

    // Update database
    agentQueries.updatePersonalSound.run(soundUrl, userId);

    res.json({ soundUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LEADERBOARD ROUTES
// ============================================================================

// Get all leaderboards
app.get('/api/leaderboards', (req, res) => {
  try {
    const leaderboards = req.query.activeOnly === 'true'
      ? leaderboardQueries.getActive.all()
      : leaderboardQueries.getAll.all();

    res.json(leaderboards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard by ID
app.get('/api/leaderboards/:id', (req, res) => {
  try {
    const leaderboard = leaderboardQueries.getById.get(req.params.id);

    if (!leaderboard) {
      return res.status(404).json({ error: 'Leaderboard not found' });
    }

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard with stats
app.get('/api/leaderboards/:id/stats', async (req, res) => {
  try {
    const leaderboard = leaderboardQueries.getById.get(req.params.id);

    if (!leaderboard) {
      return res.status(404).json({ error: 'Leaderboard not found' });
    }

    // Get agents for this leaderboard's group
    const agents = leaderboard.groupId
      ? agentQueries.getByGroupId.all(leaderboard.groupId)
      : agentQueries.getAll.all();

    // Get bonus assignments for each agent
    const agentsWithBonuses = agents.map(agent => {
      const bonusAssignments = agentBonusQueries.getByUserId.all(agent.userId);

      // Group bonus tiers by campaign
      const bonusByCampaign = {};
      bonusAssignments.forEach(ba => {
        if (!bonusByCampaign[ba.campaignName]) {
          bonusByCampaign[ba.campaignName] = {
            campaignName: ba.campaignName,
            bonusTiers: []
          };
        }
        if (ba.dealsRequired && ba.bonusPerDeal) {
          bonusByCampaign[ba.campaignName].bonusTiers.push({
            dealsRequired: ba.dealsRequired,
            bonusPerDeal: ba.bonusPerDeal
          });
        }
      });

      return {
        ...agent,
        bonusAssignments: Object.values(bonusByCampaign)
      };
    });

    // Determine date range based on time period
    let startDate, endDate;
    const now = new Date();

    switch (leaderboard.timePeriod) {
      case 'day':
        startDate = format(now, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'custom':
        startDate = leaderboard.customStartDate;
        endDate = leaderboard.customEndDate;
        break;
      default:
        startDate = format(now, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
    }

    // Fetch success leads for this period
    const leads = await fetchSuccessLeads({ startDate, endDate });

    // Calculate stats
    const stats = calculateLeaderboardStats(leads, agentsWithBonuses);

    // Add color coding
    const statsWithColors = stats.map(stat => ({
      ...stat,
      color: getEarningsColor(stat.totalEarnings, leaderboard.timePeriod)
    }));

    res.json({
      leaderboard,
      stats: statsWithColors,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create leaderboard
app.post('/api/leaderboards', (req, res) => {
  try {
    const result = leaderboardQueries.create.run({
      name: req.body.name,
      timePeriod: req.body.timePeriod,
      customStartDate: req.body.customStartDate || null,
      customEndDate: req.body.customEndDate || null,
      groupId: req.body.groupId || null,
      displayOrder: req.body.displayOrder || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : 1
    });

    const leaderboard = leaderboardQueries.getById.get(result.lastInsertRowid);
    res.status(201).json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update leaderboard
app.put('/api/leaderboards/:id', (req, res) => {
  try {
    leaderboardQueries.update.run({
      id: req.params.id,
      name: req.body.name,
      timePeriod: req.body.timePeriod,
      customStartDate: req.body.customStartDate || null,
      customEndDate: req.body.customEndDate || null,
      groupId: req.body.groupId || null,
      displayOrder: req.body.displayOrder || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : 1
    });

    const leaderboard = leaderboardQueries.getById.get(req.params.id);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete leaderboard
app.delete('/api/leaderboards/:id', (req, res) => {
  try {
    leaderboardQueries.delete.run(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BONUS TIER ROUTES
// ============================================================================

// Get all bonus tiers
app.get('/api/bonus-tiers', (req, res) => {
  try {
    const tiers = req.query.campaign
      ? bonusTierQueries.getAllByCampaign.all(req.query.campaign)
      : bonusTierQueries.getAll.all();

    res.json(tiers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update bonus tier
app.post('/api/bonus-tiers', (req, res) => {
  try {
    bonusTierQueries.upsert.run({
      campaignName: req.body.campaignName,
      dealsRequired: req.body.dealsRequired,
      bonusPerDeal: req.body.bonusPerDeal
    });

    const tiers = bonusTierQueries.getAllByCampaign.all(req.body.campaignName);
    res.json(tiers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bonus tier
app.delete('/api/bonus-tiers/:id', (req, res) => {
  try {
    bonusTierQueries.delete.run(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all tiers for a campaign
app.delete('/api/bonus-tiers/campaign/:campaignName', (req, res) => {
  try {
    bonusTierQueries.deleteByCampaign.run(req.params.campaignName);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AGENT BONUS ASSIGNMENT ROUTES
// ============================================================================

// Get bonus assignments for an agent
app.get('/api/agents/:userId/bonuses', (req, res) => {
  try {
    const userId = normalizeUserId(req.params.userId);
    const assignments = agentBonusQueries.getByUserId.all(userId);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign bonus campaign to agent
app.post('/api/agents/:userId/bonuses', (req, res) => {
  try {
    const userId = normalizeUserId(req.params.userId);

    agentBonusQueries.assign.run({
      userId,
      campaignName: req.body.campaignName
    });

    const assignments = agentBonusQueries.getByUserId.all(userId);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove bonus assignment
app.delete('/api/agents/:userId/bonuses/:campaignName', (req, res) => {
  try {
    const userId = normalizeUserId(req.params.userId);
    agentBonusQueries.unassign.run(userId, req.params.campaignName);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SLIDESHOW SETTINGS ROUTES
// ============================================================================

// Get slideshow settings
app.get('/api/slideshow-settings', (req, res) => {
  try {
    const settings = slideshowQueries.get.get();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update slideshow settings
app.put('/api/slideshow-settings', (req, res) => {
  try {
    slideshowQueries.update.run({
      displayDuration: req.body.displayDuration,
      enableSound: req.body.enableSound ? 1 : 0,
      standardSoundUrl: req.body.standardSoundUrl || null,
      milestoneSoundUrl: req.body.milestoneSoundUrl || null,
      milestoneThreshold: req.body.milestoneThreshold || 3600
    });

    const settings = slideshowQueries.get.get();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload standard sound
app.post('/api/slideshow-settings/standard-sound', upload.single('sound'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No sound file provided' });
    }

    const soundUrl = await uploadSoundFile(req.file.buffer, 'standard');

    slideshowQueries.update.run({
      ...slideshowQueries.get.get(),
      standardSoundUrl: soundUrl
    });

    res.json({ soundUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload milestone sound
app.post('/api/slideshow-settings/milestone-sound', upload.single('sound'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No sound file provided' });
    }

    const soundUrl = await uploadSoundFile(req.file.buffer, 'milestone');

    slideshowQueries.update.run({
      ...slideshowQueries.get.get(),
      milestoneSoundUrl: soundUrl
    });

    res.json({ soundUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
