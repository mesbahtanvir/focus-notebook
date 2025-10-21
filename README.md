# Personal Notebook 📓

A privacy-first productivity application designed to help manage anxiety, depression, and improve personal productivity through evidence-based techniques inspired by *Feeling Good: The New Mood Therapy* by Dr. David Burns.

## 🌟 Inspiration & Mission

This project was born from a personal journey of fighting anxiety and depression, where productivity hit rock bottom. Inspired by the cognitive behavioral therapy (CBT) techniques in *Feeling Good*, this tool aims to:

- Apply scientifically-proven CBT techniques in a digital format
- Leverage modern AI/LLM capabilities to enhance personal productivity
- Create a privacy-first, offline-first tool that keeps your data secure
- Build a compassionate system that understands the struggles of mental health
- **Stay current with modern research** on anxiety, depression, and personal productivity

This project is committed to evolving with the latest scientific findings in psychology, neuroscience, and productivity research. We actively monitor and integrate evidence-based techniques as new research emerges, ensuring that the tools and methods remain effective and aligned with current best practices.

Most of this codebase has been collaboratively developed with LLMs, demonstrating the potential of AI-assisted development in creating meaningful mental health and productivity tools.

## ✨ Key Features

### 🧠 Mental Health & Productivity Tools
- **Thoughts Tracking**: Capture and analyze your thoughts with automatic categorization
- **CBT Tools**: Guided cognitive behavioral therapy exercises
- **Mood Tracking**: Monitor your emotional wellbeing over time
- **Thought Processor**: AI-powered analysis and suggestions for managing negative thought patterns

### 📋 Task Management
- **Smart Task Organization**: Active tasks, backlog, and errands
- **Focus Sessions**: Distraction-free work sessions with balanced task selection
- **Recurring Tasks**: Daily, weekly, and monthly task automation
- **Errands Separation**: Distinguish between desk work and out-of-office tasks

### 🎯 Focus & Deep Work
- **Focus Timer**: Pomodoro and custom duration focus sessions
- **Task Balancing**: Automatic mastery/pleasure task balancing
- **Session Analytics**: Track focus session performance

### 📝 Additional Tools
- **Documents/Notes**: Rich note-taking with organization
- **Projects**: Long-term goal and project tracking
- **Brainstorming**: AI-powered ideation assistance
- **Request Logging**: Track and debug API interactions

### 🔐 Privacy & Sync
- **Offline-First**: Full functionality without internet
- **IndexedDB**: Local-first data storage
- **Firebase Sync**: Optional cloud backup with authentication
- **No Server Lock-in**: Your data stays with you

### 🤖 AI Integration
- **Background Processing**: Optional LLM-powered thought analysis
- **Smart Suggestions**: Context-aware task and action recommendations
- **OpenAI Integration**: Configurable API key for enhanced features

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: Dexie.js (IndexedDB wrapper)
- **Backend**: Firebase (Authentication & Firestore)
- **Animation**: Framer Motion
- **Forms**: React Hook Form
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Testing**: Jest + React Testing Library

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mesbahtanvir/personal-notebook.git
   cd personal-notebook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration (Optional - for cloud sync)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Running Tests

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:ci
```

## 📦 Deployment

### Deploy to Vercel

1. **Push your code to GitHub**

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js configuration

3. **Configure Environment Variables**
   - Add your Firebase credentials in Vercel project settings
   - Go to Settings → Environment Variables
   - Add all `NEXT_PUBLIC_*` variables

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically deploy on every push to main

### Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Authentication (Email/Password or Google)
   - Enable Firestore Database

2. **Configure Firestore Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. **Get Firebase Configuration**
   - Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the configuration and add to `.env.local`

## 🤝 Contributing

We welcome contributions! This project is in active development, and we'd love your help making it better.

### Contribution Guidelines

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow existing code style
   - Write meaningful commit messages
   - Add tests for new features

4. **Run tests**
   ```bash
   npm test
   npm run lint
   ```

5. **Submit a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure all tests pass

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Remember this is a mental health tool - be empathetic
- Help others learn and grow

## 🎯 Areas Where Contributions Are Needed

### High Priority

1. **End-to-End Testing**
   - Implement comprehensive E2E tests using Playwright or Cypress
   - CI/CD integration for automated testing on PRs
   - Critical user flows coverage (task creation, focus sessions, sync)

2. **Testing Infrastructure**
   - Increase unit test coverage (currently minimal)
   - Integration tests for database operations
   - Component testing for UI elements

3. **Accessibility (a11y)**
   - Keyboard navigation improvements
   - Screen reader support
   - ARIA labels and semantic HTML
   - Color contrast and theme improvements

### Medium Priority

4. **Mobile Optimization**
   - iOS app refinement (Capacitor setup exists)
   - Android app support
   - PWA enhancements
   - Touch gesture support

5. **Documentation**
   - API documentation
   - Component documentation
   - User guides and tutorials
   - Video walkthroughs

6. **Performance**
   - Optimize bundle size
   - Lazy loading improvements
   - Database query optimization
   - Memory leak detection

### Features & Enhancements

7. **Additional CBT Tools**
   - Daily mood logs with trend analysis
   - Gratitude journal
   - Automatic negative thought detection
   - Guided meditation timer

8. **Data Visualization**
   - Mood charts and trends
   - Productivity analytics dashboard
   - Task completion patterns
   - Focus session insights

9. **Export/Import**
   - JSON export/import (partially implemented)
   - CSV export for data analysis
   - Backup/restore automation
   - Data migration tools

### Infrastructure

10. **CI/CD Pipeline**
    - GitHub Actions for testing
    - Automated deployment previews
    - Linting and type checking on PRs
    - Security vulnerability scanning

11. **Error Monitoring**
    - Sentry or similar integration
    - Error boundary improvements
    - Logging infrastructure
    - User feedback system

## 📚 Learning Resources

Understanding personal productivity and mental health can help guide this project's development. Here are recommended resources:

### Books

1. **Feeling Good: The New Mood Therapy** by David D. Burns, M.D.
   - The primary inspiration for this project
   - Evidence-based CBT techniques
   - [Amazon Link](https://www.amazon.com/Feeling-Good-New-Mood-Therapy/dp/0380810336)

2. **Deep Work** by Cal Newport
   - Strategies for focused work
   - Minimizing distractions
   - [Amazon Link](https://www.amazon.com/Deep-Work-Focused-Success-Distracted/dp/1455586692)

3. **Atomic Habits** by James Clear
   - Building sustainable habits
   - Small incremental changes
   - [Amazon Link](https://www.amazon.com/Atomic-Habits-Proven-Build-Break/dp/0735211299)

4. **Getting Things Done (GTD)** by David Allen
   - Task management methodology
   - Stress-free productivity
   - [Amazon Link](https://www.amazon.com/Getting-Things-Done-Stress-Free-Productivity/dp/0142000280)

### Online Resources

- [Cognitive Behavioral Therapy Guide](https://www.apa.org/ptsd-guideline/patients-and-families/cognitive-behavioral)
- [Pomodoro Technique](https://francescocirillo.com/pages/pomodoro-technique)
- [Mental Health First Aid](https://www.mentalhealthfirstaid.org/)
- [The Science of Well-Being (Yale Course)](https://www.coursera.org/learn/the-science-of-well-being)

### Research Resources

Stay informed with the latest research:

- **Psychology & Mental Health Research**
  - [PubMed Central - Psychology](https://www.ncbi.nlm.nih.gov/pmc/journals/psychology/)
  - [American Psychological Association (APA)](https://www.apa.org/pubs/journals)
  - [Cognitive Therapy and Research Journal](https://www.springer.com/journal/10608)
  - [Journal of Anxiety Disorders](https://www.journals.elsevier.com/journal-of-anxiety-disorders)
  - [Cognitive Behaviour Therapy Journal](https://www.tandfonline.com/journals/sbeh20)

- **Productivity & Performance Research**
  - [Journal of Applied Psychology](https://www.apa.org/pubs/journals/apl)
  - [Organizational Behavior and Human Decision Processes](https://www.journals.elsevier.com/organizational-behavior-and-human-decision-processes)
  - [Harvard Business Review - Productivity](https://hbr.org/topic/subject/productivity)

- **Neuroscience & Well-being**
  - [Nature Neuroscience](https://www.nature.com/neuro/)
  - [Frontiers in Psychology](https://www.frontiersin.org/journals/psychology)
  - [Greater Good Science Center](https://greatergood.berkeley.edu/)

- **Research Aggregators**
  - [Google Scholar](https://scholar.google.com/) - Search academic papers
  - [ResearchGate](https://www.researchgate.net/) - Connect with researchers
  - [PsycINFO](https://www.apa.org/pubs/databases/psycinfo) - Psychology database

### Technical Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Web Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [Progressive Web Apps Guide](https://web.dev/progressive-web-apps/)

## 🗺️ Roadmap

### Technical Improvements
- [ ] Comprehensive E2E testing with CI integration
- [ ] Mobile app improvements (iOS/Android)
- [ ] Advanced analytics and insights
- [ ] Plugin/extension system
- [ ] Offline AI models for privacy
- [ ] Community features (optional, privacy-preserving)

### Research-Driven Features
- [ ] **Regular research reviews**: Quarterly updates based on latest findings in psychology and productivity
- [ ] Enhanced CBT tools based on recent therapeutic advances
- [ ] Integration of new evidence-based techniques (e.g., ACT, DBT, mindfulness)
- [ ] Neuroscience-informed productivity features
- [ ] Research-backed habit formation tools
- [ ] Evidence-based mood regulation techniques
- [ ] Scientific literature integration for tool recommendations

## 🐛 Bug Reports & Feature Requests

Please use [GitHub Issues](https://github.com/mesbahtanvir/personal-notebook/issues) to report bugs or request features.

When reporting bugs, please include:
- Browser/OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Dr. David Burns for *Feeling Good* and the CBT techniques
- The open-source community
- All contributors who help make this better
- Everyone fighting their own battles with mental health - you're not alone

## 💬 Contact

- **Author**: Mesbah Tanvir
- **GitHub**: [@mesbahtanvir](https://github.com/mesbahtanvir)
- **Project**: [personal-notebook](https://github.com/mesbahtanvir/personal-notebook)

---

**Remember**: This tool is meant to support your mental health journey, not replace professional help. If you're struggling, please reach out to a mental health professional or call a crisis helpline.

*Built with ❤️ using AI assistance, for anyone seeking better mental health and productivity.*
