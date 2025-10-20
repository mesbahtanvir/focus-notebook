import { renderHook, act } from '@testing-library/react';
import { useThoughts } from '@/store/useThoughts';

describe('useThoughts', () => {
  beforeEach(() => {
    // Clear thoughts before each test
    const { result } = renderHook(() => useThoughts());
    act(() => {
      result.current.thoughts.forEach(thought => {
        result.current.deleteThought(thought.id);
      });
    });
  });

  it('initializes with empty thoughts', () => {
    const { result } = renderHook(() => useThoughts());
    
    // After initialization, thoughts should be loaded
    expect(Array.isArray(result.current.thoughts)).toBe(true);
  });

  it('adds a new thought', async () => {
    const { result } = renderHook(() => useThoughts());
    
    await act(async () => {
      await result.current.add({
        text: 'Test thought',
        type: 'neutral',
        createdAt: new Date().toISOString(),
      });
    });

    expect(result.current.thoughts.length).toBe(1);
    expect(result.current.thoughts[0].text).toBe('Test thought');
    expect(result.current.thoughts[0].type).toBe('neutral');
    expect(result.current.thoughts[0].done).toBe(false);
  });

  it('adds thought with tags', async () => {
    const { result } = renderHook(() => useThoughts());
    
    await act(async () => {
      await result.current.add({
        text: 'CBT thought',
        type: 'feeling-bad',
        createdAt: new Date().toISOString(),
        tags: ['cbt', 'anxiety'],
      });
    });

    expect(result.current.thoughts[0].tags).toEqual(['cbt', 'anxiety']);
  });

  it('adds thought with intensity', async () => {
    const { result } = renderHook(() => useThoughts());
    
    await act(async () => {
      await result.current.add({
        text: 'Intense feeling',
        type: 'feeling-bad',
        createdAt: new Date().toISOString(),
        intensity: 8,
      });
    });

    expect(result.current.thoughts[0].intensity).toBe(8);
  });

  it('toggles thought done status', async () => {
    const { result } = renderHook(() => useThoughts());
    
    let thoughtId: string;
    await act(async () => {
      await result.current.add({
        text: 'Toggle test',
        type: 'task',
        createdAt: new Date().toISOString(),
      });
    });

    thoughtId = result.current.thoughts[0].id;
    expect(result.current.thoughts[0].done).toBe(false);

    await act(async () => {
      await result.current.toggle(thoughtId);
    });

    expect(result.current.thoughts[0].done).toBe(true);

    await act(async () => {
      await result.current.toggle(thoughtId);
    });

    expect(result.current.thoughts[0].done).toBe(false);
  });

  it('updates thought with CBT analysis', async () => {
    const { result } = renderHook(() => useThoughts());
    
    let thoughtId: string;
    await act(async () => {
      await result.current.add({
        text: 'Thought to analyze',
        type: 'feeling-bad',
        createdAt: new Date().toISOString(),
        tags: ['cbt'],
      });
    });

    thoughtId = result.current.thoughts[0].id;

    const cbtAnalysis = {
      situation: 'Test situation',
      automaticThought: 'Test thought',
      emotions: 'Anxiety (80%)',
      alternativeThought: 'Balanced thought',
    };

    await act(async () => {
      await result.current.updateThought(thoughtId, {
        cbtAnalysis,
        tags: ['cbt', 'cbt-processed'],
      });
    });

    expect(result.current.thoughts[0].cbtAnalysis).toEqual(cbtAnalysis);
    expect(result.current.thoughts[0].tags).toContain('cbt-processed');
  });

  it('deletes a thought', async () => {
    const { result } = renderHook(() => useThoughts());
    
    let thoughtId: string;
    await act(async () => {
      await result.current.add({
        text: 'Delete me',
        type: 'neutral',
        createdAt: new Date().toISOString(),
      });
    });

    thoughtId = result.current.thoughts[0].id;
    expect(result.current.thoughts.length).toBe(1);

    await act(async () => {
      await result.current.deleteThought(thoughtId);
    });

    expect(result.current.thoughts.length).toBe(0);
  });

  it('handles different thought types', async () => {
    const { result } = renderHook(() => useThoughts());
    
    const types: Array<'neutral' | 'task' | 'feeling-good' | 'feeling-bad'> = [
      'neutral',
      'task',
      'feeling-good',
      'feeling-bad',
    ];

    for (const type of types) {
      await act(async () => {
        await result.current.add({
          text: `${type} thought`,
          type,
          createdAt: new Date().toISOString(),
        });
      });
    }

    expect(result.current.thoughts.length).toBe(4);
    expect(result.current.thoughts.map(t => t.type)).toEqual(types);
  });

  it('maintains thought order', async () => {
    const { result } = renderHook(() => useThoughts());
    
    await act(async () => {
      await result.current.add({
        text: 'First',
        type: 'neutral',
        createdAt: '2024-01-01T00:00:00Z',
      });
      await result.current.add({
        text: 'Second',
        type: 'neutral',
        createdAt: '2024-01-02T00:00:00Z',
      });
    });

    // Thoughts should be in the order they were added
    expect(result.current.thoughts[0].text).toBe('First');
    expect(result.current.thoughts[1].text).toBe('Second');
  });
});
