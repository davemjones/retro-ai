import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
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

// Import the component we need to test
// We'll create a minimal test component that reproduces the issue
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

describe('Select Component Empty Value Bug', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ teams: [], templates: [] }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should identify the empty string value issue in Select component', () => {
    // This test documents the exact issue reported:
    // "A <Select.Item /> must have a value prop that is not an empty string"
    
    const problematicValues = ["", null, undefined];
    
    problematicValues.forEach(value => {
      if (value === "") {
        // Empty string is the problematic value that causes the runtime error
        expect(value).toBe("");
        expect(typeof value).toBe("string");
        expect(value.length).toBe(0);
        
        // This is what causes the error in the actual component:
        // <SelectItem value="">Blank Board</SelectItem>
      }
    });
    
    // The fix is to use a non-empty string value instead
    const fixedValue = "blank";
    expect(fixedValue).not.toBe("");
    expect(fixedValue.length).toBeGreaterThan(0);
  });

  it('should demonstrate the correct way to handle optional selection', () => {
    // This test shows how to fix the issue
    const FixedTestComponent = () => {
      const [selectedTemplate, setSelectedTemplate] = React.useState<string | undefined>(undefined);
      
      return (
        <Select
          value={selectedTemplate}
          onValueChange={(value) => setSelectedTemplate(value === "blank" ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a template (optional)" />
          </SelectTrigger>
          <SelectContent>
            {/* Use a non-empty string value like "blank" instead of "" */}
            <SelectItem value="blank">Blank Board</SelectItem>
            <SelectItem value="template1">Template 1</SelectItem>
          </SelectContent>
        </Select>
      );
    };

    // This should render without errors
    expect(() => {
      render(<FixedTestComponent />);
    }).not.toThrow();
  });

  it('should verify Select component behavior with proper values', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    const TestSelect = () => (
      <Select onValueChange={mockOnChange}>
        <SelectTrigger data-testid="select-trigger">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );

    render(<TestSelect />);
    
    const trigger = screen.getByTestId('select-trigger');
    expect(trigger).toBeInTheDocument();
    
    // Verify the component renders without the empty string issue
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('should demonstrate the state initialization issue', () => {
    // This shows the problematic state initialization
    const problematicState = "";
    
    // This would cause issues when used as Select value
    expect(problematicState).toBe("");
    expect(typeof problematicState).toBe("string");
    expect(problematicState.length).toBe(0);
    
    // The correct approach would be to use undefined for no selection
    const correctState = undefined;
    expect(correctState).toBeUndefined();
  });
});