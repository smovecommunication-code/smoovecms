import type { Project } from '../domain/contentSchemas';

export type { Project };

export const projects: Project[] = [
  {
    id: 'smove-platform',
    title: 'Plateforme SMOVE Digital',
    client: 'SMOVE Communication',
    category: 'Développement Web',
    year: '2024',
    description: 'Création d\'une plateforme web moderne pour la gestion de projets digitaux et la communication client.',
    challenge: 'Développer une solution complète permettant de gérer tous les aspects de la communication digitale en un seul endroit.',
    solution: 'Architecture web progressive avec React, système de gestion de contenu intégré, dashboard analytique et interface client intuitive.',
    results: [
      'Réduction de 60% du temps de gestion de projet',
      'Augmentation de 45% de la satisfaction client',
      'Interface utilisateur primée pour son design',
      '100% responsive sur tous les appareils',
    ],
    tags: ['React', 'Node.js', 'MongoDB', 'UI/UX', 'Dashboard'],
    mainImage: 'modern web platform dashboard interface',
    images: [
      'web dashboard analytics colorful',
      'project management interface modern',
      'client portal design clean',
    ],
    testimonial: {
      text: 'SMOVE a transformé notre façon de travailler. La plateforme est intuitive, rapide et répond parfaitement à nos besoins.',
      author: 'Jean-Marc Kouassi',
      position: 'Directeur Général',
    },
  },
  {
    id: 'ecla-btp-branding',
    title: 'Identité Visuelle ECLA BTP',
    client: 'ECLA BTP',
    category: 'Branding',
    year: '2024',
    description: 'Refonte complète de l\'identité visuelle d\'une entreprise de construction leader en Côte d\'Ivoire.',
    challenge: 'Moderniser l\'image de marque tout en conservant la crédibilité et l\'héritage de l\'entreprise.',
    solution: 'Nouveau logo symbolisant la solidité et l\'innovation, charte graphique professionnelle, supports de communication print et digital.',
    results: [
      'Augmentation de 80% de la reconnaissance de marque',
      'Nouveau positionnement premium sur le marché',
      'Cohérence visuelle sur tous les supports',
      'Impact immédiat sur les réseaux sociaux',
    ],
    tags: ['Logo Design', 'Branding', 'Print', 'Digital', 'Charte Graphique'],
    mainImage: 'construction company branding modern',
    images: [
      'logo design construction professional',
      'brand identity mockup business cards',
      'corporate branding materials',
    ],
    testimonial: {
      text: 'Notre nouvelle identité visuelle nous a donné une image beaucoup plus moderne et professionnelle. Les retours sont excellents!',
      author: 'Marie Koné',
      position: 'Directrice Marketing, ECLA BTP',
    },
  },
  {
    id: 'gobon-sarl-ecommerce',
    title: 'Boutique en Ligne Gobon Sarl',
    client: 'Gobon Sarl',
    category: 'E-commerce',
    year: '2023',
    description: 'Développement d\'une boutique en ligne complète pour la vente de produits alimentaires avec système de livraison.',
    challenge: 'Créer une expérience d\'achat fluide adaptée au marché local avec paiement mobile intégré.',
    solution: 'Plateforme e-commerce sur mesure avec paiement mobile money, système de gestion des stocks, tracking de livraison et interface administrateur.',
    results: [
      'Lancement réussi avec 1000+ commandes le premier mois',
      'Taux de conversion de 3.8% (supérieur à la moyenne)',
      'Intégration parfaite des paiements mobiles',
      'Système de livraison optimisé pour Abidjan',
    ],
    tags: ['E-commerce', 'Next.js', 'Payment Integration', 'Mobile', 'Logistics'],
    mainImage: 'ecommerce website african products',
    images: [
      'online store modern clean design',
      'shopping cart checkout process',
      'mobile ecommerce app interface',
    ],
    testimonial: {
      text: 'Grâce à SMOVE, nous avons pu digitaliser notre commerce en un temps record. Les ventes en ligne dépassent nos attentes!',
      author: 'Ibrahim Traoré',
      position: 'PDG, Gobon Sarl',
    },
  },
  {
    id: 'restaurant-afrik-taste',
    title: 'Application Mobile Afrik Taste',
    client: 'Afrik Taste Restaurant',
    category: 'Application Mobile',
    year: '2023',
    description: 'Application mobile de commande et livraison pour une chaîne de restaurants ivoiriens.',
    challenge: 'Offrir une expérience de commande simple et rapide avec suivi en temps réel de la livraison.',
    solution: 'Application native iOS et Android avec menu interactif, personnalisation des plats, paiement intégré et suivi GPS de livraison.',
    results: [
      '50,000+ téléchargements en 3 mois',
      'Note moyenne de 4.8/5 sur les stores',
      'Augmentation de 120% des commandes',
      'Fidélisation client améliorée de 65%',
    ],
    tags: ['React Native', 'Mobile App', 'GPS', 'Payment', 'Real-time'],
    mainImage: 'restaurant mobile app food delivery',
    images: [
      'food delivery app interface colorful',
      'restaurant menu app design',
      'order tracking map mobile',
    ],
    testimonial: {
      text: 'L\'application a révolutionné notre business. Nos clients adorent la simplicité et la rapidité du service.',
      author: 'Fatou Diallo',
      position: 'Directrice, Afrik Taste',
    },
  },
  {
    id: 'ministry-campaign',
    title: 'Campagne Digitale Ministère',
    client: 'Ministère de la Jeunesse',
    category: 'Communication Digitale',
    year: '2023',
    description: 'Campagne de communication digitale pour promouvoir l\'entrepreneuriat jeune en Côte d\'Ivoire.',
    challenge: 'Atteindre et engager les jeunes sur les réseaux sociaux avec un message impactant.',
    solution: 'Stratégie de contenu multicanal, vidéos virales, motion design, community management et influenceurs.',
    results: [
      '5 millions de vues sur les réseaux sociaux',
      '200,000+ interactions (likes, partages, commentaires)',
      'Augmentation de 300% des inscriptions au programme',
      'Tendance #1 sur Twitter Côte d\'Ivoire pendant 3 jours',
    ],
    tags: ['Social Media', 'Video', 'Motion Design', 'Strategy', 'Influencers'],
    mainImage: 'social media campaign colorful youth',
    images: [
      'social media graphics modern vibrant',
      'video production studio creative',
      'digital campaign analytics dashboard',
    ],
  },
  {
    id: 'bank-mobile-app',
    title: 'Application Bancaire Mobile',
    client: 'Banque Atlantique CI',
    category: 'FinTech',
    year: '2024',
    description: 'Application mobile bancaire nouvelle génération avec fonctionnalités avancées.',
    challenge: 'Créer une expérience bancaire mobile sécurisée, rapide et intuitive pour tous les âges.',
    solution: 'Architecture sécurisée, biométrie, virements instantanés, gestion de budget AI, notifications intelligentes.',
    results: [
      '200,000+ utilisateurs actifs',
      'Réduction de 70% des visites en agence',
      'Transactions 5x plus rapides',
      'Sécurité renforcée avec authentification biométrique',
    ],
    tags: ['FinTech', 'Mobile', 'Security', 'AI', 'Banking'],
    mainImage: 'mobile banking app modern secure',
    images: [
      'banking app interface clean professional',
      'payment transfer mobile design',
      'financial dashboard mobile analytics',
    ],
  },
  {
    id: 'fashion-brand-3d',
    title: 'Expérience 3D Marque de Mode',
    client: 'Ivoire Fashion House',
    category: 'Création 3D',
    year: '2024',
    description: 'Création d\'une expérience 3D immersive pour le lancement d\'une collection de mode.',
    challenge: 'Se démarquer lors du lancement avec une expérience digitale innovante et mémorable.',
    solution: 'Showroom virtuel 3D, essayage virtuel AR, vidéo 3D de défilé, configurateur de produits interactif.',
    results: [
      'Expérience partagée 100,000+ fois',
      'Temps d\'engagement moyen de 8 minutes',
      'Conversion augmentée de 150%',
      'Couverture médiatique nationale et internationale',
    ],
    tags: ['3D Modeling', 'AR', 'Virtual Showroom', 'Interactive', 'Fashion'],
    mainImage: '3d fashion virtual showroom',
    images: [
      '3d modeling fashion design',
      'augmented reality clothing app',
      'virtual reality shopping experience',
    ],
  },
  {
    id: 'education-platform',
    title: 'Plateforme E-Learning',
    client: 'Université Virtuelle CI',
    category: 'EdTech',
    year: '2023',
    description: 'Plateforme complète d\'apprentissage en ligne avec cours interactifs et certifications.',
    challenge: 'Rendre l\'éducation accessible et engageante pour des milliers d\'étudiants à distance.',
    solution: 'LMS complet avec vidéos HD, quizz interactifs, forums, suivi de progression, certifications automatiques.',
    results: [
      '15,000+ étudiants inscrits',
      '500+ cours disponibles',
      'Taux de complétion de 78%',
      'Certification reconnue par l\'État',
    ],
    tags: ['EdTech', 'LMS', 'Video Streaming', 'Gamification', 'Certificates'],
    mainImage: 'online learning platform modern',
    images: [
      'elearning dashboard student interface',
      'video course player interactive',
      'certification system online education',
    ],
  },
];

export const projectCategories = [
  'Tous',
  'Développement Web',
  'Branding',
  'E-commerce',
  'Application Mobile',
  'Communication Digitale',
  'FinTech',
  'Création 3D',
  'EdTech',
];

export function getProjectById(id: string): Project | undefined {
  return projects.find(p => p.id === id);
}

export function getProjectsByCategory(category: string): Project[] {
  if (category === 'Tous') return projects;
  return projects.filter(p => p.category === category);
}

export function getFeaturedProjects(count: number = 3): Project[] {
  return projects.slice(0, count);
}
