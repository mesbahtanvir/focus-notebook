# Contributing to Personal Notebook

First off, thank you for considering contributing to Personal Notebook! 🎉

This project is built to help people struggling with mental health and productivity issues. Every contribution, no matter how small, makes a difference in someone's life.

## 🌟 Ways to Contribute

### 1. Code Contributions
- Bug fixes
- New features
- Performance improvements
- Refactoring
- Test coverage

### 2. Documentation
- README improvements
- Code documentation
- User guides
- API documentation
- Tutorial videos

### 3. Testing
- Write unit tests
- Write integration tests
- Write E2E tests
- Manual testing and bug reports

### 4. Design
- UI/UX improvements
- Accessibility enhancements
- Design mockups
- Icon and asset creation

### 5. Research & Evidence
- Share relevant research papers on anxiety, depression, or productivity
- Propose features based on recent scientific findings
- Review and validate current implementations against latest research
- Suggest updates to CBT techniques based on modern therapy advances
- Contribute to research literature review

### 6. Community
- Answer questions in issues
- Help others get started
- Share your experience
- Spread the word

## 🚀 Getting Started

### Setting Up Your Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/personal-notebook.git
   cd personal-notebook
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/mesbahtanvir/personal-notebook.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Development Workflow

1. **Keep your fork updated**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Keep commits focused and atomic

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Commit with meaningful messages**
   ```bash
   git commit -m "feat: add mood trend chart to dashboard"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Provide a clear description
   - Link related issues

## 📝 Code Style Guidelines

### TypeScript/React

- Use **TypeScript** for type safety
- Use **functional components** with hooks
- **Prefer named exports** over default exports
- Use **async/await** over promises when possible
- Keep components **small and focused**

```typescript
// ✅ Good
export function TaskList({ tasks }: TaskListProps) {
  const [filter, setFilter] = useState<string>('all');
  
  return (
    <div className="task-list">
      {/* component content */}
    </div>
  );
}

// ❌ Avoid
export default ({ tasks }: any) => {
  // component logic
}
```

### File Organization

```
src/
├── app/              # Next.js app directory
├── components/       # Reusable components
├── lib/             # Utilities and helpers
├── store/           # Zustand state stores
├── contexts/        # React contexts
├── hooks/           # Custom React hooks
└── types/           # TypeScript type definitions
```

### Naming Conventions

- **Components**: PascalCase (`TaskList.tsx`)
- **Hooks**: camelCase with `use` prefix (`useTaskFilter.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TASKS`)
- **Types/Interfaces**: PascalCase (`TaskStatus`, `UserSettings`)

### CSS/Styling

- Use **Tailwind CSS** utility classes
- Group related utilities together
- Use **custom classes** for repeated patterns
- Prefer **dark mode** compatible styles

```tsx
// ✅ Good
<button className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors">
  Submit
</button>

// ❌ Avoid inline styles
<button style={{ padding: '8px 16px', backgroundColor: '#9333ea' }}>
  Submit
</button>
```

## 🧪 Testing Guidelines

### Writing Tests

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user flows

### Test Structure

```typescript
describe('TaskList Component', () => {
  it('should render tasks correctly', () => {
    // Arrange
    const tasks = [/* mock tasks */];
    
    // Act
    render(<TaskList tasks={tasks} />);
    
    // Assert
    expect(screen.getByText(tasks[0].title)).toBeInTheDocument();
  });
  
  it('should filter tasks by status', async () => {
    // Test filtering functionality
  });
});
```

### Test Coverage Goals

- **Unit Tests**: Aim for 70%+ coverage
- **Critical Paths**: 90%+ coverage for core features
- **Edge Cases**: Test error conditions and boundaries

## 🎯 Pull Request Guidelines

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No console.log or debugging code
- [ ] Build succeeds (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### PR Title Format

Use conventional commit format:

- `feat: add new feature`
- `fix: resolve bug in component`
- `docs: update README`
- `test: add unit tests`
- `refactor: improve code structure`
- `style: format code`
- `chore: update dependencies`

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## 🔍 Code Review Process

1. **Automated Checks**: CI runs tests and linting
2. **Maintainer Review**: Code review by maintainers
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, PR will be merged
5. **Celebration**: Your contribution is live! 🎉

### Review Timeline

- Initial review: Within 3-5 days
- Follow-up reviews: 1-2 days
- Emergency fixes: Same day

## 🐛 Reporting Bugs

### Before Reporting

1. Search existing issues
2. Try the latest version
3. Reproduce the bug consistently

### Bug Report Template

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 13.0]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 0.1.0]

## Screenshots
If applicable

## Additional Context
Any other information
```

## 💡 Suggesting Features

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Problem It Solves
What user problem does this address?

## Proposed Solution
How should this work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Any other information, mockups, or examples
```

## 🎓 Learning & Growth

### For First-Time Contributors

- Start with issues labeled `good first issue`
- Ask questions - we're here to help!
- Don't worry about making mistakes
- Every expert was once a beginner

### Mentorship

If you'd like guidance:
1. Comment on an issue you're interested in
2. Ask for help in discussions
3. Join community channels (if available)

## 📚 Resources for Contributors

### Project-Specific

- [Architecture Overview](./docs/IMPLEMENTATION_PLAN.md)
- [Testing Guide](./docs/TESTING.md)
- [Component Usage Examples](./docs/COMPONENT_USAGE_EXAMPLE.md)

### General

- [Next.js Documentation](https://nextjs.org/docs)
- [React Testing Library](https://testing-library.com/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Standards

**✅ Encouraged Behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**❌ Unacceptable Behavior:**
- Trolling, insulting, or derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

### Enforcement

Instances of unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## 🏆 Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

## 📞 Getting Help

- **Questions**: Open a discussion or issue
- **Chat**: (Add Discord/Slack if available)
- **Email**: (Add email if available)

## 🎉 Thank You!

Your contributions make this project possible. Whether you're fixing a typo or implementing a major feature, you're helping people manage their mental health and productivity better.

Remember: this is a tool built by people with mental health challenges, for people with mental health challenges. Be kind, be patient, and let's build something amazing together! 💜

---

*"The only way to do great work is to love what you do."* - Steve Jobs
