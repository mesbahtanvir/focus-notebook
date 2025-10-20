# Thoughts Management Tool

A comprehensive tool for capturing and analyzing thoughts with integrated CBT (Cognitive Behavioral Therapy) framework.

## Features

### 1. Thought Capture
- **Quick entry**: Capture any thought that comes to mind
- **Type categorization**:
  - **Task**: Things lingering in your mind that need to be done
  - **Feeling Good**: Positive emotions and experiences
  - **Feeling Bad**: Negative emotions that may need processing
  - **Neutral**: General thoughts and observations

### 2. Thought Management
- **Filtering**: Filter by thought type and completion status
- **Statistics Dashboard**: See totals for all thought categories
- **Tagging**: Organize thoughts with custom tags
- **Intensity Tracking**: Rate emotional intensity (1-10) for feelings
- **Mark as Done**: Complete thoughts when processed or acted upon

### 3. CBT Analysis Framework

For thoughts categorized as "Feeling Bad", you can perform structured CBT analysis:

#### The 6-Step Process:

1. **Situation**: Describe what triggered the feeling objectively
2. **Automatic Thought**: Capture the immediate thought that came to mind
3. **Emotion**: Identify the emotion(s) you felt
4. **Evidence**: List facts that support AND contradict your thought
5. **Alternative Thought**: Develop a more balanced, realistic perspective
6. **Outcome**: Reflect on how your feelings changed and next steps

### Usage

1. Navigate to **Tools → Thoughts**
2. Click **"New Thought"** to capture a thought
3. Select the appropriate type and add details
4. Click on any thought to view details
5. For "Feeling Bad" thoughts, use the **CBT Analysis** tab to work through difficult emotions

### Benefits

- **Mental Clarity**: Get thoughts out of your head and onto paper
- **Emotional Processing**: Use CBT techniques to work through negative feelings
- **Task Management**: Convert mental tasks into actionable items
- **Pattern Recognition**: Track recurring thoughts and emotions with tags
- **Progress Tracking**: See how many thoughts you've analyzed and completed

## Technical Details

- **Storage**: All thoughts are stored locally using IndexedDB
- **Privacy**: No data leaves your device
- **Schema**: Supports text, type, tags, intensity, and full CBT analysis structure
- **Database Version**: v6 (includes thoughts table with extended fields)

## Navigation

Access the tool at: `/tools/thoughts`
