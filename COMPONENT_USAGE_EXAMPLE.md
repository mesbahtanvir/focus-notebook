# Tool Components Usage Examples

## Basic Structure

Every tool page should follow this pattern:

```tsx
import {
  ToolPageLayout,
  ToolHeader,
  ToolFilters,
  FilterSelect,
  FilterToggle,
  ToolContent,
  ToolGrid,
  ToolList,
  ToolCard,
  EmptyState
} from '@/components/tools';
import { Plus, Target } from 'lucide-react';

export default function MyToolPage() {
  // State and logic here
  const [showCompleted, setShowCompleted] = useState(false);
  const [filter, setFilter] = useState('all');
  
  return (
    <ToolPageLayout>
      {/* Header with inline stats */}
      <ToolHeader
        title="Tasks"
        stats={[
          { label: 'active', value: 15 },
          { label: 'done', value: 8 },
          { label: 'overdue', value: 3, variant: 'warning' }
        ]}
        action={{
          label: 'New Task',
          icon: Plus,
          onClick: () => setShowNewTask(true)
        }}
      />

      {/* Filters (optional) */}
      <ToolFilters>
        <FilterSelect
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' }
          ]}
        />
        <FilterToggle
          label={showCompleted ? 'Hide completed' : 'Show completed'}
          active={showCompleted}
          onClick={() => setShowCompleted(!showCompleted)}
        />
      </ToolFilters>

      {/* Content */}
      <ToolContent>
        {items.length === 0 ? (
          <EmptyState
            icon={<Target className="h-12 w-12" />}
            title="No tasks yet"
            description="Create your first task to get started"
            action={{
              label: 'Create Task',
              onClick: () => setShowNewTask(true)
            }}
          />
        ) : (
          <ToolGrid columns={3}>
            {items.map(item => (
              <ToolCard key={item.id} onClick={() => handleClick(item)}>
                {/* Card content */}
              </ToolCard>
            ))}
          </ToolGrid>
        )}
      </ToolContent>
    </ToolPageLayout>
  );
}
```

## Example 1: Tasks Page

```tsx
import { ToolPageLayout, ToolHeader, ToolFilters, FilterSelect, FilterToggle, ToolGrid, ToolCard, EmptyState } from '@/components/tools';
import { Plus, CheckCircle } from 'lucide-react';

export default function TasksPage() {
  const tasks = useTasks((s) => s.tasks);
  const [showCompleted, setShowCompleted] = useState(false);
  const [priority, setPriority] = useState('all');
  
  const activeTasks = tasks.filter(t => !t.done).length;
  const completedTasks = tasks.filter(t => t.done).length;
  const overdueTasks = tasks.filter(t => !t.done && isOverdue(t)).length;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Tasks"
        stats={[
          { label: 'active', value: activeTasks },
          { label: 'done', value: completedTasks },
          { label: 'overdue', value: overdueTasks, variant: 'warning' }
        ]}
        action={{
          label: 'New Task',
          icon: Plus,
          onClick: () => setShowNewTask(true)
        }}
      />

      <ToolFilters>
        <FilterSelect
          value={priority}
          onChange={setPriority}
          options={[
            { value: 'all', label: 'All Priorities' },
            { value: 'urgent', label: 'Urgent' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' }
          ]}
        />
        <FilterToggle
          label={showCompleted ? 'Hide' : 'Show'} + ' completed'
          active={showCompleted}
          onClick={() => setShowCompleted(!showCompleted)}
        />
      </ToolFilters>

      <ToolContent>
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="h-12 w-12" />}
            title="No tasks"
            description="Create your first task"
            action={{
              label: 'New Task',
              onClick: () => setShowNewTask(true)
            }}
          />
        ) : (
          <ToolGrid columns={3}>
            {filteredTasks.map(task => (
              <ToolCard key={task.id} onClick={() => setSelectedTask(task)}>
                <h3 className="font-medium text-sm">{task.title}</h3>
                {/* More task details */}
              </ToolCard>
            ))}
          </ToolGrid>
        )}
      </ToolContent>
    </ToolPageLayout>
  );
}
```

## Example 2: Projects Page

```tsx
import { ToolPageLayout, ToolHeader, ToolFilters, FilterSelect, ToolList, ToolCard, EmptyState } from '@/components/tools';
import { Plus, Target } from 'lucide-react';

export default function ProjectsPage() {
  const projects = useProjects((s) => s.projects);
  
  return (
    <ToolPageLayout>
      <ToolHeader
        title="Projects"
        stats={[
          { label: 'active', value: projects.filter(p => p.status === 'active').length },
          { label: 'done', value: projects.filter(p => p.status === 'completed').length },
          { label: 'short-term', value: projects.filter(p => p.timeframe === 'short-term').length },
          { label: 'long-term', value: projects.filter(p => p.timeframe === 'long-term').length }
        ]}
        action={{
          label: 'New Project',
          icon: Plus,
          onClick: () => setShowNew(true)
        }}
      />

      <ToolFilters>
        <FilterSelect
          value={filterTimeframe}
          onChange={setFilterTimeframe}
          options={[
            { value: 'all', label: 'All Timeframes' },
            { value: 'short-term', label: 'Short-term' },
            { value: 'long-term', label: 'Long-term' }
          ]}
        />
        <FilterSelect
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' }
          ]}
        />
      </ToolFilters>

      <ToolContent>
        <ToolList>
          {filteredProjects.map(project => (
            <ToolCard key={project.id} onClick={() => setSelected(project)}>
              <h3 className="font-bold text-base">{project.title}</h3>
              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {project.description}
                </p>
              )}
              {/* Progress bar, etc. */}
            </ToolCard>
          ))}
        </ToolList>
      </ToolContent>
    </ToolPageLayout>
  );
}
```

## Example 3: Focus Session Page

```tsx
import { ToolPageLayout, ToolHeader, ToolFilters, FilterToggle, ToolContent, ToolCard, EmptyState } from '@/components/tools';
import { Play, History } from 'lucide-react';

export default function FocusPage() {
  const sessions = useFocus((s) => s.sessions);
  const [showHistory, setShowHistory] = useState(false);
  
  return (
    <ToolPageLayout>
      <ToolHeader
        title="Focus"
        stats={[
          { label: 'sessions', value: sessions.length },
          { label: 'total hours', value: getTotalHours() }
        ]}
        action={{
          label: 'Start Session',
          icon: Play,
          onClick: () => setShowSetup(true)
        }}
      />

      <ToolFilters>
        <FilterToggle
          label={showHistory ? 'Hide history' : 'Show history'}
          active={showHistory}
          onClick={() => setShowHistory(!showHistory)}
        />
      </ToolFilters>

      <ToolContent>
        {/* Quick start buttons */}
        <div className="grid grid-cols-3 gap-2">
          <ToolCard onClick={() => startSession(25)}>
            <div className="text-center">
              <div className="text-lg font-bold">25m</div>
              <div className="text-xs text-gray-500">Pomodoro</div>
            </div>
          </ToolCard>
          {/* More quick start options */}
        </div>

        {showHistory && (
          <div className="space-y-2">
            {sessions.map(session => (
              <ToolCard key={session.id} onClick={() => setSelected(session)}>
                {/* Session details */}
              </ToolCard>
            ))}
          </div>
        )}
      </ToolContent>
    </ToolPageLayout>
  );
}
```

## Component API Reference

### ToolPageLayout
```tsx
interface ToolPageLayoutProps {
  children: ReactNode;
  maxWidth?: 'default' | 'wide' | 'full'; // default: 'default'
}
```

### ToolHeader
```tsx
interface ToolHeaderProps {
  title: string;
  stats?: Array<{
    label: string;
    value: number | string;
    variant?: 'default' | 'success' | 'warning' | 'info';
  }>;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
  subtitle?: string; // Optional subtitle below title
}
```

### ToolFilters
```tsx
// Container for filter controls
<ToolFilters>
  {/* Filter components go here */}
</ToolFilters>
```

### FilterSelect
```tsx
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}
```

### FilterButton
```tsx
interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}
```

### FilterToggle
```tsx
interface FilterToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
}
```

### ToolCard
```tsx
interface ToolCardProps {
  children: ReactNode;
  onClick?: () => void; // Makes card clickable
  className?: string; // Additional classes
}
```

### ToolGrid
```tsx
interface ToolGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4; // default: 3
  className?: string;
}
```

### ToolList
```tsx
interface ToolListProps {
  children: ReactNode;
  className?: string;
}
```

### EmptyState
```tsx
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

## Migration Steps

1. Import tool components:
   ```tsx
   import { ToolPageLayout, ToolHeader, ... } from '@/components/tools';
   ```

2. Replace existing header with `ToolHeader`

3. Move stats inline to header (no separate stat cards)

4. Replace filter sections with `ToolFilters`

5. Wrap content in `ToolPageLayout` and `ToolContent`

6. Use `ToolCard`, `ToolGrid`, or `ToolList` for content display

7. Update spacing from `space-y-6` to `space-y-4`

8. Test responsive behavior and dark mode

## Benefits

- **Consistency**: All tools look the same
- **Reusability**: Change once, updates everywhere
- **Maintainability**: Single source of truth
- **Smaller Bundles**: Shared components
- **Faster Development**: No need to recreate UI each time
