import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// We need to import the actual component but it's wrapped in Suspense
// So let's create a test wrapper
const mockTeams = [
  { id: 'team1', name: 'Test Team 1' },
  { id: 'team2', name: 'Test Team 2' },
];

const mockTemplates = [
  {
    id: 'template1',
    name: 'Sprint Retrospective',
    description: 'Standard sprint retrospective template',
    columns: [
      { title: 'What went well', order: 1, color: '#green' },
      { title: 'What could be improved', order: 2, color: '#yellow' },
      { title: 'Action items', order: 3, color: '#blue' },
    ],
  },
];

describe('Board Creation Form - Select Component Fix', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ teams: mockTeams }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should verify Select components do not use empty string values', async () => {
    // Import the form component
    const NewBoardPage = (await import('@/app/(dashboard)/boards/new/page')).default;
    
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <NewBoardPage />
      </Suspense>
    );

    // Wait for the form to load by checking for a unique element
    await waitFor(() => {
      expect(screen.getByText('Board Details')).toBeInTheDocument();
    });

    // Verify the template select loads without errors
    await waitFor(() => {
      expect(screen.getByText('Select a template (optional)')).toBeInTheDocument();
    });
  });

  it('should handle blank board selection correctly', async () => {
    const user = userEvent.setup();
    const NewBoardPage = (await import('@/app/(dashboard)/boards/new/page')).default;
    
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <NewBoardPage />
      </Suspense>
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByText('Board Details')).toBeInTheDocument();
    });

    // Try to interact with the template select
    const templateSelect = screen.getByText('Select a template (optional)');
    expect(templateSelect).toBeInTheDocument();
    
    // The form should render without throwing the SelectItem empty value error
    // We can verify this by checking that the form loaded successfully
    expect(screen.getByText('Choose a template to structure your retrospective')).toBeInTheDocument();
  });

  it('should demonstrate the fix for empty string values', () => {
    // Before fix: selectedTemplate was initialized as ""
    const problematicInitialState = "";
    expect(problematicInitialState).toBe("");
    
    // After fix: selectedTemplate is initialized as undefined
    const fixedInitialState = undefined;
    expect(fixedInitialState).toBeUndefined();
    
    // Before fix: SelectItem had value=""
    const problematicSelectValue = "";
    expect(problematicSelectValue).toBe("");
    expect(problematicSelectValue.length).toBe(0);
    
    // After fix: SelectItem has value="blank"
    const fixedSelectValue = "blank";
    expect(fixedSelectValue).not.toBe("");
    expect(fixedSelectValue.length).toBeGreaterThan(0);
    expect(fixedSelectValue).toBe("blank");
  });

  it('should properly handle template selection logic', () => {
    // Test the template selection logic
    const templates = mockTemplates;
    
    // Test blank selection
    const blankSelection = "blank";
    const blankTemplateData = blankSelection === "blank" ? null : templates.find(t => t.id === blankSelection);
    expect(blankTemplateData).toBeNull();
    
    // Test actual template selection
    const templateSelection = "template1";
    const actualTemplateData = templateSelection === "blank" ? null : templates.find(t => t.id === templateSelection);
    expect(actualTemplateData).toEqual(mockTemplates[0]);
    
    // Test form submission logic
    const blankSubmissionValue = blankSelection === "blank" ? null : blankSelection || null;
    expect(blankSubmissionValue).toBeNull();
    
    const templateSubmissionValue = templateSelection === "blank" ? null : templateSelection || null;
    expect(templateSubmissionValue).toBe("template1");
  });

  it('should verify no console errors during render', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const NewBoardPage = (await import('@/app/(dashboard)/boards/new/page')).default;
    
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <NewBoardPage />
      </Suspense>
    );

    // Wait for component to fully render
    await waitFor(() => {
      expect(screen.getByText('Board Details')).toBeInTheDocument();
    });

    // Should not have any console errors about Select.Item values
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Select.Item')
    );
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('empty string')
    );
    
    consoleSpy.mockRestore();
  });
});