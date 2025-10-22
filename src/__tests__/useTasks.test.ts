import { act } from '@testing-library/react'

jest.mock('@/db', () => {
  const rows = new Map<string, any>()
  return {
    __esModule: true,
    __mock: { rows },
    db: {
      tasks: {
        toArray: jest.fn(async () => Array.from(rows.values())),
        add: jest.fn(async (row: any) => { rows.set(row.id, { ...row }); return row.id }),
        update: jest.fn(async (id: string, changes: any) => {
          const prev = rows.get(id)
          if (!prev) return 0
          rows.set(id, { ...prev, ...changes })
          return 1
        }),
        delete: jest.fn(async (id: string) => rows.delete(id)),
      },
    },
    toTask: (row: any) => ({ ...row }),
    toTaskRow: (task: any) => ({ ...task }),
  }
})

describe('useTasks store', () => {
  let useTasks: any
  beforeEach(() => {
    // reset in-memory DB and store state
    const { __mock } = require('@/db') as { __mock: { rows: Map<string, any> } }
    __mock.rows.clear()
    // require store AFTER mock is established to avoid race
    useTasks = require('@/store/useTasks').useTasks
    useTasks.setState({ tasks: [], isLoading: false })
    jest.clearAllMocks()
  })

  it('adds a task and persists to Dexie', async () => {
    await act(async () => {
      await useTasks.getState().add({
        title: 'Write tests',
        category: 'mastery' as any,
        status: 'active' as any,
      })
    })

    const tasks = useTasks.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Write tests')

    // ensure add hit the mocked DB
    const { db } = await import('@/db')
    expect((db.tasks.add as jest.Mock).mock.calls.length).toBe(1)
  })

  it('toggles a task to completed and updates Dexie', async () => {
    // seed one task via add
    let taskId = ''
    await act(async () => {
      await useTasks.getState().add({
        title: 'Complete me',
        category: 'mastery' as any,
        status: 'active' as any,
      })
    })
    taskId = useTasks.getState().tasks[0].id

    await act(async () => {
      await useTasks.getState().toggle(taskId)
    })

    const updated = useTasks.getState().tasks[0]
    expect(updated.done).toBe(true)
    expect(updated.status).toBe('completed')
    expect(updated.completedAt).toBeTruthy()

    const { db } = await import('@/db')
    expect((db.tasks.update as jest.Mock)).toHaveBeenCalled()
  })

  it('moves a task to backlog via updateTask and persists', async () => {
    await act(async () => {
      await useTasks.getState().add({
        title: 'Backlog candidate',
        category: 'pleasure' as any,
        status: 'active' as any,
      })
    })
    const id = useTasks.getState().tasks[0].id

    await act(async () => {
      await useTasks.getState().updateTask(id, { status: 'backlog' as any })
    })

    const t = useTasks.getState().tasks[0]
    expect(t.status).toBe('backlog')

    const { db } = await import('@/db')
    expect((db.tasks.update as jest.Mock)).toHaveBeenCalled()
  })

  it('loads tasks from Dexie via loadTasks', async () => {
    // seed in mocked DB directly using the exposed mock rows
    const now = new Date().toISOString()
    const { __mock } = require('@/db') as { __mock: { rows: Map<string, any> } }
    __mock.rows.set('1', { id: '1', title: 'Seeded', done: false, category: 'mastery', status: 'active', createdAt: now })

    await act(async () => {
      await useTasks.getState().loadTasks()
    })

    const tasks = useTasks.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Seeded')
  })
})
