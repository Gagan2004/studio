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
    fieldName: z.string().describe('The name of the user data field to map.'),
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
{{#each (Object.keys userData)}}
  {{@key}}: {{{lookup ../userData @key}}}
{{/each}}

And the following form fields:
{{#each formFields}}
  - Name: {{name}}, Label: {{label}}, Placeholder: {{placeholder}}, Type: {{type}}
{{/each}}

Create a JSON array mapping the user data fields to the form fields. Only include mappings where you are confident the data is relevant. Return an empty array if you can't create any confident mappings.

Ensure that your response is a valid JSON array of objects with 'fieldName' and 'value' keys.

Example:
[
  { "fieldName": "user_email", "value": "john.doe@example.com" },
  { "fieldName": "user_name", "value": "John Doe" }
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
    return output!;
  }
);
