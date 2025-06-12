
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { UserData, FormFieldDetail, Vault } from '@/types'; // Added Vault
import { getDefaultVault } from '@/lib/storage'; // Changed to getDefaultVault
import { mapFormFields, MapFormFieldsInput } from '@/ai/flows/map-form-fields';
import { Wand2, Eye, EyeOff, Loader2 } from 'lucide-react';

interface SampleFormElements extends HTMLFormControlsCollection {
  fullName: HTMLInputElement;
  emailAddress: HTMLInputElement;
  phoneNumber: HTMLInputElement;
  shippingAddress: HTMLTextAreaElement;
  companyName: HTMLInputElement;
  job: HTMLInputElement;
  userWebsite: HTMLInputElement;
  feedback: HTMLTextAreaElement;
}

interface SampleFormElement extends HTMLFormElement {
  readonly elements: SampleFormElements;
}

export function AutofillPageClient() {
  const { toast } = useToast();
  const [defaultVaultData, setDefaultVaultData] = useState<UserData | null>(null); // Renamed from userData
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSampleData, setShowSampleData] = useState(false);
  const [isLoadingVault, setIsLoadingVault] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingVault(true);
      const vault = await getDefaultVault();
      setDefaultVaultData(vault ? vault.data : null);
      setIsLoadingVault(false);
    };
    loadData();
  }, []);

  const extractFormFields = (): FormFieldDetail[] => {
    const form = document.getElementById('sampleForm') as HTMLFormElement;
    if (!form) return [];

    const fields: FormFieldDetail[] = [];
    const inputIds = ['fullName', 'emailAddress', 'phoneNumber', 'shippingAddress', 'companyName', 'job', 'userWebsite', 'feedback'];

    inputIds.forEach(id => {
      const element = form.elements.namedItem(id) as HTMLInputElement | HTMLTextAreaElement;
      if (element) {
        let labelText = '';
        const labelElement = document.querySelector(`label[for="${id}"]`);
        if (labelElement) {
          labelText = labelElement.textContent || '';
        }
        
        fields.push({
          id: element.id,
          name: element.name,
          label: labelText,
          placeholder: element.placeholder,
          type: element.type,
          value: element.value,
        });
      }
    });
    return fields;
  };

  const handleAutofill = async () => {
    if (!defaultVaultData) {
      toast({
        title: 'No Default Vault Data',
        description: 'Please save your information in a vault and set one as default.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    const extractedFields = extractFormFields();
    if (extractedFields.length === 0) {
      toast({ title: 'Error', description: 'Could not find form fields.', variant: 'destructive' });
      setIsProcessing(false);
      return;
    }
    
    const aiInput: MapFormFieldsInput = {
      userData: Object.entries(defaultVaultData) // Use defaultVaultData here
        .filter(([_, value]) => typeof value === 'string')
        .reduce((obj, [key, value]) => {
          obj[key] = value as string;
          return obj;
        }, {} as Record<string, string>),
      formFields: extractedFields.map(f => ({
        name: f.name,
        label: f.label,
        placeholder: f.placeholder,
        type: f.type,
      })),
    };

    try {
      const mappings = await mapFormFields(aiInput);
      
      if (mappings.length === 0) {
        toast({
          title: 'No Mappings Found',
          description: 'The AI could not confidently map your data to the form fields.',
        });
      } else {
        mappings.forEach(mapping => {
          const fieldElement = document.getElementsByName(mapping.fieldName)[0] as HTMLInputElement | HTMLTextAreaElement;
          if (fieldElement) {
            fieldElement.value = mapping.value;
          }
        });
        toast({
          title: 'Autofill Complete!',
          description: `${mappings.length} field(s) have been populated from your default vault.`,
        });
      }
    } catch (error) {
      console.error('Error during AI mapping or autofill:', error);
      toast({
        title: 'Autofill Error',
        description: 'An error occurred while trying to autofill the form.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetForm = (event: FormEvent<HTMLFormElement>) => {
    const form = document.getElementById('sampleForm') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    toast({ title: 'Form Cleared', description: 'Sample form has been reset.'});
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <Card className="shadow-xl border-2 border-accent/20 rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-accent to-primary text-primary-foreground p-6">
          <CardTitle className="text-3xl font-headline flex items-center gap-3">
            <Wand2 className="w-8 h-8" />
             Autofill Tester
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 text-base">
            Test AI form filling using data from your default vault. Manage vaults in the Data Vault section.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingVault ? (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50 text-center">
              <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading default vault data...
            </div>
          ) : defaultVaultData ? (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-foreground">Default Vault Data Preview</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSampleData(!showSampleData)}>
                  {showSampleData ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {showSampleData ? 'Hide' : 'Show'} Data
                </Button>
              </div>
              {showSampleData && (
                <pre className="text-sm bg-background p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(defaultVaultData, null, 2)}
                </pre>
              )}
            </div>
          ) : (
             <div className="mb-6 p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive text-center">
                No default vault data found. Please go to the Data Vault, create a vault, add your information, and set it as default.
            </div>
          )}

          <form id="sampleForm" className="space-y-6" onReset={resetForm}>
            <div>
              <Label htmlFor="fullName" className="text-base">Full Name</Label>
              <Input id="fullName" name="fullName" placeholder="Your Full Name" className="mt-1 text-base py-3 px-4 rounded-lg"/>
            </div>
            <div>
              <Label htmlFor="emailAddress" className="text-base">Email Address</Label>
              <Input id="emailAddress" name="emailAddress" type="email" placeholder="your.email@example.com" className="mt-1 text-base py-3 px-4 rounded-lg"/>
            </div>
            <div>
              <Label htmlFor="phoneNumber" className="text-base">Phone Number</Label>
              <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="(555) 123-4567" className="mt-1 text-base py-3 px-4 rounded-lg"/>
            </div>
            <div>
              <Label htmlFor="shippingAddress" className="text-base">Shipping Address</Label>
              <Textarea id="shippingAddress" name="shippingAddress" placeholder="123 Example Street, City, Country, Postal Code" className="mt-1 text-base py-3 px-4 rounded-lg"/>
            </div>
            <div>
              <Label htmlFor="companyName" className="text-base">Company Name (Optional)</Label>
              <Input id="companyName" name="companyName" placeholder="Your Company Inc." className="mt-1 text-base py-3 px-4 rounded-lg"/>
            </div>
             <div>
              <Label htmlFor="job" className="text-base">Job Title</Label>
              <Input id="job" name="job" placeholder="e.g. Astronaut" className="mt-1 text-base py-3 px-4 rounded-lg"/>
            </div>
            <div>
              <Label htmlFor="userWebsite" className="text-base">Website</Label>
              <Input id="userWebsite" name="userWebsite" type="url" placeholder="https://your-website.com" className="mt-1 text-base py-3 px-4 rounded-lg"/>
            </div>
            <div>
              <Label htmlFor="feedback" className="text-base">Feedback / Comments</Label>
              <Textarea id="feedback" name="feedback" placeholder="Any additional comments or feedback..." className="mt-1 text-base py-3 px-4 rounded-lg"/>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                type="button" 
                onClick={handleAutofill} 
                disabled={isProcessing || !defaultVaultData || isLoadingVault}
                className="w-full sm:w-auto text-lg py-3 bg-accent hover:bg-accent/90 flex-1"
                size="lg"
              >
                {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                AI Autofill Form
              </Button>
              <Button 
                type="reset" 
                variant="outline"
                className="w-full sm:w-auto text-lg py-3 flex-1"
                size="lg"
              >
                Clear Form
              </Button>
            </div>
            {(!defaultVaultData && !isLoadingVault) && (
              <p className="text-sm text-destructive text-center mt-4">
                Please add your information in a vault and set it as default to use the Autofill feature.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

