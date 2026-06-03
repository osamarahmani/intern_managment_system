export const mockInterns = [
  {
    id: 1,
    photo: null,
    name: 'Arun Kumar',
    collegeName: 'PSG College of Technology',
    dept: 'Computer Science',
    year: '3rd Year',
    sem: '6',
    mail: 'arun@example.com',
    number: '+91 9876543210',
    startingDate: '2024-06-01',
    endingDate: '2024-08-31',
    project: {
      title: '',
      description: '',
      gitRepoLink: '',
      liveProjectLink: ''
    },
    tasks: [
      {
        id: 'task-1-1',
        title: 'Review System Design Document',
        description: 'Read the draft architecture specification and provide feedback on scalability.',
        dueDate: '2024-06-10',
        submissionDate: '2024-06-09'
      },
      {
        id: 'task-1-2',
        title: 'Setup API Gateway Boilerplate',
        description: 'Create a Node.js Express server routing traffic to microservices.',
        dueDate: '2024-06-15',
        submissionDate: ''
      }
    ]
  },
  {
    id: 2,
    photo: null,
    name: 'Sneha Rao',
    collegeName: 'BITS Pilani',
    dept: 'Information Technology',
    year: '4th Year',
    sem: '8',
    mail: 'sneha@example.com',
    number: '+91 9123456789',
    startingDate: '2024-05-15',
    endingDate: '2024-07-15',
    project: {
      title: 'Smart Health Dashboard',
      description: 'A React-based web portal for doctors to view live telemetry statistics of cardiac patients.',
      gitRepoLink: 'https://github.com/sneha-rao/smart-health',
      liveProjectLink: 'https://smarthealth-telemetry.netlify.app'
    },
    tasks: [
      {
        id: 'task-2-1',
        title: 'Create Dashboard UI Mockups',
        description: 'Design interactive high-fidelity wireframes in Figma.',
        dueDate: '2024-05-20',
        submissionDate: '2024-05-19'
      },
      {
        id: 'task-2-2',
        title: 'Integrate WebSockets',
        description: 'Establish bidirectional telemetry communication stream using Socket.io.',
        dueDate: '2024-06-01',
        submissionDate: '2024-05-30'
      }
    ]
  },
  {
    id: 3,
    photo: null,
    name: 'Vikram Singh',
    collegeName: 'IIT Madras',
    dept: 'Electronics & Communication',
    year: '2nd Year',
    sem: '4',
    mail: 'vikram@example.com',
    number: '+91 8887776665',
    startingDate: '2024-06-15',
    endingDate: '2024-09-15',
    project: {
      title: '',
      description: '',
      gitRepoLink: '',
      liveProjectLink: ''
    },
    tasks: []
  },
  {
    id: 4,
    photo: null,
    name: 'Pooja Patel',
    collegeName: 'NIT Trichy',
    dept: 'Computer Applications',
    year: '3rd Year',
    sem: '5',
    mail: 'pooja@example.com',
    number: '+91 7776665554',
    startingDate: '2024-06-01',
    endingDate: '2024-08-31',
    project: {
      title: 'E-Commerce Microservices',
      description: 'Containerized inventory and payment gateways orchestrated using Docker and Kubernetes.',
      gitRepoLink: 'https://github.com/pooja-patel/ecommerce-infra',
      liveProjectLink: ''
    },
    tasks: [
      {
        id: 'task-4-1',
        title: 'Draft DB Schema',
        description: 'Design the PostgreSQL catalog and order transaction tables.',
        dueDate: '2024-06-05',
        submissionDate: ''
      }
    ]
  }
];
