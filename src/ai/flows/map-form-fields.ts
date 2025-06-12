
'use server';

/**
 * @fileOverview AI-powered form field mapping flow.
 *
 * - mapFormFields - A function that maps stored user data to form fields on a webpage.
 * - MapFormFieldsInput - The input type for the mapFormFields function.
 * - MapFormFieldsOutput - The return type for the mapFormFields function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MapFormFieldsInputSchema = z.object({
  userData: z.record(z.string()).describe('User data stored in the extension.'),
  formFields: z.array(
    z.object({
      name: z.string().optional().describe('The name attribute of the form field.'),
      label: z.string().optional().describe('The label associated with the form field.'),
      placeholder: z.string().optional().describe('The placeholder text of the form field.'),
      type: z.string().optional().describe('The type of the form field.'),
    })
  ).describe('Extracted form fields from the webpage.'),
});
export type MapFormFieldsInput = z.infer<typeof MapFormFieldsInputSchema>;

const MapFormFieldsOutputSchema = z.array(
  z.object({
    fieldName: z.string().describe('The name attribute of the form field to map to (e.g., "fullName", "emailAddress").'),
    value: z.string().describe('The value to fill in the form field with.'),
  })
);
export type MapFormFieldsOutput = z.infer<typeof MapFormFieldsOutputSchema>;

export async function mapFormFields(input: MapFormFieldsInput): Promise<MapFormFieldsOutput> {
  return mapFormFieldsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'mapFormFieldsPrompt',
  input: {schema: MapFormFieldsInputSchema},
  output: {schema: MapFormFieldsOutputSchema},
  prompt: `You are an AI assistant designed to map user data to form fields on a webpage.

You are given the following user data:
{{#each userData}}
  {{@key}}: {{{this}}}
{{/each}}

And the following form fields from the webpage:
{{#each formFields}}
  - Name: {{name}}, Label: {{label}}, Placeholder: {{placeholder}}, Type: {{type}}
{{/each}}

Your task is to create a JSON array that maps relevant user data fields to the corresponding form field names.
The 'fieldName' in your output MUST exactly match one of the 'name' attributes from the provided form fields.
Only include mappings where you are confident the data is relevant.
If you cannot create any confident mappings, return an empty JSON array.

Ensure your response is a valid JSON array of objects, where each object has a 'fieldName' (string) and a 'value' (string) key.

Example of a valid response:
[
  { "fieldName": "emailAddress", "value": "john.doe@example.com" },
  { "fieldName": "fullName", "value": "John Doe" }
]
`,
});

const mapFormFieldsFlow = ai.defineFlow(
  {
    name: 'mapFormFieldsFlow',
    inputSchema: MapFormFieldsInputSchema,
    outputSchema: MapFormFieldsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // If the AI fails to produce valid output, output can be null.
    // In such cases, return an empty array as per the prompt's instruction.
    return output || [];
  }
);

