require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Ticket = require('./models/Ticket');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected for seeding');
};

const departments = ['Technical Support', 'Billing & Payments', 'Account & Access', 'General Support', 'Security'];

const agentData = [
  { name: 'Rahul Sharma', email: 'agent1@example.com', password: 'agent123', department: 'Technical Support' },
  { name: 'Priya Patel', email: 'agent2@example.com', password: 'agent123', department: 'Billing & Payments' },
  { name: 'Arjun Mehta', email: 'agent3@example.com', password: 'agent123', department: 'Account & Access' },
  { name: 'Sneha Gupta', email: 'agent4@example.com', password: 'agent123', department: 'General Support' },
  { name: 'Vikram Singh', email: 'agent5@example.com', password: 'agent123', department: 'Security' }
];

const clientData = [
  { name: 'John Smith', email: 'client@example.com', password: 'client123' },
  { name: 'Sarah Johnson', email: 'client2@example.com', password: 'client123' }
];

const ticketTemplates = [
  {
    subject: 'Payment deducted twice from my account',
    description: 'I made one payment but my account was charged twice. Please help urgently. Transaction ID: TXN-98765. Total excess charge: $49.99.',
    urgency: 'High',
    concern: 'Payment Issue',
    department: 'Billing & Payments',
    status: 'In Progress',
    tags: ['payment', 'billing', 'duplicate-charge', 'refund'],
    priorityScore: 75
  },
  {
    subject: 'Cannot login to my account - Account appears locked',
    description: 'I have been trying to login for the past 2 hours but I keep getting "Invalid credentials" error. I have tried resetting my password but the OTP is not arriving. Please help!',
    urgency: 'High',
    concern: 'Login Issue',
    department: 'Account & Access',
    status: 'Open',
    tags: ['login', 'password', 'access', 'otp'],
    priorityScore: 70
  },
  {
    subject: 'URGENT: Suspicious activity on my account - Possible Hack',
    description: 'I noticed several unauthorized transactions and logins from unknown locations. Someone may have hacked my account. I need immediate assistance to secure my account and reverse unauthorized transactions.',
    urgency: 'Critical',
    concern: 'Security Issue',
    department: 'Security',
    status: 'Open',
    tags: ['security', 'urgent', 'breach', 'unauthorized'],
    priorityScore: 95
  },
  {
    subject: 'Application crashes when uploading files larger than 5MB',
    description: 'Every time I try to upload a file larger than 5MB, the application crashes and shows a 500 Internal Server Error. This happens consistently across different browsers. I have tested on Chrome, Firefox, and Edge.',
    urgency: 'High',
    concern: 'Bug Report',
    department: 'Technical Support',
    status: 'In Progress',
    tags: ['bug', 'upload', 'crash', 'technical'],
    priorityScore: 68
  },
  {
    subject: 'How do I export my data to CSV format?',
    description: 'I need to export all my account data and transaction history to a CSV file for accounting purposes. I have looked through the settings but cannot find this option. Please guide me.',
    urgency: 'Low',
    concern: 'General Question',
    department: 'General Support',
    status: 'Resolved',
    tags: ['general', 'export', 'csv'],
    priorityScore: 15
  },
  {
    subject: 'Feature Request: Dark mode for the dashboard',
    description: 'It would be great to have a dark mode option for the dashboard. Many users prefer dark themes especially for extended use. Please consider adding this in the next update.',
    urgency: 'Low',
    concern: 'Feature Request',
    department: 'General Support',
    status: 'Closed',
    tags: ['feature-request', 'dark-mode', 'ui'],
    priorityScore: 12
  },
  {
    subject: 'Subscription plan not updating after payment',
    description: 'I upgraded from Basic to Premium plan 3 days ago. The payment was successful (I have the receipt) but my account still shows the Basic plan. I cannot access premium features.',
    urgency: 'Medium',
    concern: 'Payment Issue',
    department: 'Billing & Payments',
    status: 'Waiting for Customer',
    tags: ['billing', 'subscription', 'upgrade'],
    priorityScore: 50
  },
  {
    subject: 'Website extremely slow - Taking 30+ seconds to load',
    description: 'The website has been very slow for the past week. Pages take 30-40 seconds to load. This is affecting my work significantly. I have tested with fast internet and the issue persists.',
    urgency: 'Medium',
    concern: 'Technical Problem',
    department: 'Technical Support',
    status: 'In Progress',
    tags: ['performance', 'slow', 'technical'],
    priorityScore: 45
  }
];

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('🧹 Clearing existing demo data...');
    await User.deleteMany({ email: { $in: [...agentData.map(a => a.email), ...clientData.map(c => c.email)] } });
    await Ticket.deleteMany({});
    await mongoose.connection.collection('counters').deleteMany({});

    // Create agents
    console.log('👥 Creating agents...');
    const agents = [];
    for (const agentInfo of agentData) {
      const agent = await User.create({
        ...agentInfo,
        role: 'agent',
        isAvailable: true,
        activeTicketCount: 0
      });
      agents.push(agent);
      console.log(`  ✅ Agent: ${agent.name} (${agent.department})`);
    }

    // Create clients
    console.log('👤 Creating clients...');
    const clients = [];
    for (const clientInfo of clientData) {
      const client = await User.create({ ...clientInfo, role: 'client' });
      clients.push(client);
      console.log(`  ✅ Client: ${client.name}`);
    }

    const client = clients[0];
    const client2 = clients[1];

    // Agent lookup by department
    const agentByDept = {};
    for (const agent of agents) {
      agentByDept[agent.department] = agent;
    }

    // Create tickets with messages
    console.log('🎫 Creating tickets...');
    const now = new Date();

    for (let i = 0; i < ticketTemplates.length; i++) {
      const template = ticketTemplates[i];
      const ticketNum = 10001 + i;
      const createdAt = new Date(now.getTime() - (ticketTemplates.length - i) * 60 * 60 * 1000 * 2);

      // SLA durations
      const slaDurations = { Critical: 1, High: 2, Medium: 8, Low: 24 };
      const slaHours = slaDurations[template.urgency];
      const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);

      const assignedAgent = agentByDept[template.department] || agents[0];

      // Determine if SLA is breached (for demo)
      const isEscalated = template.urgency === 'Critical' && i === 2;

      const messages = [
        {
          sender: client._id,
          senderRole: 'system',
          senderName: 'System',
          message: `Ticket TKT-${ticketNum} created. Automatically classified as **${template.urgency}** priority.`,
          isInternal: false,
          createdAt: new Date(createdAt.getTime() + 1000)
        },
        {
          sender: client._id,
          senderRole: 'system',
          senderName: 'System',
          message: `Assigned to **${assignedAgent.name}** (${template.department}).`,
          isInternal: false,
          createdAt: new Date(createdAt.getTime() + 2000)
        }
      ];

      // Add realistic conversation for non-new tickets
      if (['In Progress', 'Waiting for Customer', 'Resolved', 'Closed'].includes(template.status)) {
        messages.push({
          sender: client._id,
          senderRole: 'client',
          senderName: client.name,
          message: template.description,
          isInternal: false,
          createdAt: new Date(createdAt.getTime() + 5 * 60 * 1000)
        });

        if (template.status !== 'Open') {
          messages.push({
            sender: assignedAgent._id,
            senderRole: 'agent',
            senderName: assignedAgent.name,
            message: `Hi ${client.name.split(' ')[0]}, thank you for reaching out. I've reviewed your ticket and I'm looking into this right away. I'll update you with progress shortly.`,
            isInternal: false,
            createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000)
          });
        }

        if (template.status === 'Resolved' || template.status === 'Closed') {
          messages.push({
            sender: assignedAgent._id,
            senderRole: 'agent',
            senderName: assignedAgent.name,
            message: `Hi ${client.name.split(' ')[0]}, I'm happy to inform you that your issue has been resolved. Please let me know if you need any further assistance. Closing this ticket now.`,
            isInternal: false,
            createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
          });

          messages.push({
            sender: assignedAgent._id,
            senderRole: 'system',
            senderName: 'System',
            message: `Ticket marked as **${template.status}** by ${assignedAgent.name}.`,
            isInternal: false,
            createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000 + 1000)
          });
        }
      }

      if (isEscalated) {
        messages.push({
          sender: client._id,
          senderRole: 'system',
          senderName: 'System',
          message: `⚠️ SLA BREACHED: This ticket has exceeded its response time limit and has been automatically escalated. Urgency upgraded to Critical.`,
          isInternal: false,
          createdAt: new Date(slaDeadline.getTime() + 5 * 60 * 1000)
        });
      }

      const internalNotes = [];
      if (template.status === 'In Progress' || template.status === 'Waiting for Customer') {
        internalNotes.push({
          sender: assignedAgent._id,
          senderRole: 'agent',
          senderName: assignedAgent.name,
          message: `Internal: Checked the customer's account. Issue confirmed. Following up with the backend team.`,
          isInternal: true,
          createdAt: new Date(createdAt.getTime() + 45 * 60 * 1000)
        });
      }

      const ticket = await Ticket.create({
        ticketNumber: `TKT-${ticketNum}`,
        client: i % 2 === 0 ? client._id : client2._id,
        subject: template.subject,
        description: template.description,
        urgency: template.urgency,
        concern: template.concern,
        department: template.department,
        status: template.status,
        tags: template.tags,
        priorityScore: template.priorityScore,
        assignedAgent: assignedAgent._id,
        assignedAt: createdAt,
        slaDeadline,
        escalated: isEscalated,
        escalatedAt: isEscalated ? new Date(slaDeadline.getTime() + 5 * 60 * 1000) : null,
        messages,
        internalNotes,
        firstResponseAt: ['In Progress', 'Waiting for Customer', 'Resolved', 'Closed'].includes(template.status)
          ? new Date(createdAt.getTime() + 30 * 60 * 1000)
          : null,
        resolvedAt: ['Resolved', 'Closed'].includes(template.status)
          ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
          : null,
        createdAt,
        metadata: { source: 'web', browser: 'Chrome', os: 'Windows' }
      });

      // Update agent's ticket count
      if (!['Resolved', 'Closed'].includes(template.status)) {
        await User.findByIdAndUpdate(assignedAgent._id, { $inc: { activeTicketCount: 1 } });
      }

      console.log(`  ✅ Ticket: TKT-${ticketNum} | ${template.urgency} | ${template.department} | ${template.status}`);
    }

    // Initialize counter at the right value
    await mongoose.connection.collection('counters').insertOne({
      _id: 'ticketNumber',
      seq: 10001 + ticketTemplates.length
    });

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('📋 Demo Credentials:');
    console.log('─────────────────────────────────────');
    console.log('CLIENT:');
    console.log('  Email:    client@example.com');
    console.log('  Password: client123');
    console.log('\nAGENTS:');
    for (const agent of agentData) {
      console.log(`  ${agent.name} (${agent.department})`);
      console.log(`    Email: ${agent.email} | Password: agent123`);
    }
    console.log('─────────────────────────────────────');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB disconnected.');
    process.exit(0);
  }
};

seed();
