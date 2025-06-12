
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { UserData } from '@/types';
import { getDefaultVault } from '@/lib/storage';
import { Wand2, Eye, EyeOff, Loader2, FileCode } from 'lucide-react'; // Added FileCode for active tab autofill

// Determine if running in an extension context
const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

export function AutofillPageClient() {
  const { toast } = useToast();
  const [defaultVaultData, setDefaultVaultData] = useState<UserData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSampleData, setShowSampleData] = useState(false);
  const [isLoadingVault, setIsLoadingVault] = useState(true);
  const [isAutofillingActiveTab, setIsAutofillingActiveTab] = useState(false);


  useEffect(() => {
    const loadData = async () => {
      setIsLoadingVault(true);
      const vault = await getDefaultVault();
      setDefaultVaultData(vault ? vault.data : null);
      setIsLoadingVault(false);
    };
    loadData();
  }, []);

  // This function is now for the *sample form* on this page only
  const handleAutofillSampleForm = async () => {
    if (!defaultVaultData) {
      toast({
        title: 'No Default Vault Data',
        description: 'Please save data in your default vault first.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    // Extract fields from the *sample form* on this page
    const form = document.getElementById('sampleForm') as HTMLFormElement;
    const extractedFieldsForAI = [];
    if (form) {
        const inputIds = ['fullName', 'emailAddress', 'phoneNumber', 'shippingAddress', 'companyName', 'job', 'userWebsite', 'feedback'];
        inputIds.forEach(id => {
            const element = form.elements.namedItem(id) as HTMLInputElement | HTMLTextAreaElement;
            if (element) {
                let labelText = '';
                const labelElement = document.querySelector(`label[for="${id}"]`);
                labelText = labelElement ? labelElement.textContent || '' : '';
                extractedFieldsForAI.push({
                    name: element.name,
                    label: labelText,
                    placeholder: element.placeholder,
                    type: element.type,
                });
            }
        });
    }

    if (extractedFieldsForAI.length === 0) {
      toast({ title: 'Error', description: 'Could not find sample form fields.', variant: 'destructive' });
      setIsProcessing(false);
      return;
    }
    
    const aiInput = {
      userData: Object.entries(defaultVaultData)
        .filter(([_, value]) => typeof value === 'string')
        .reduce((obj, [key, value]) => {
          obj[key] = value as string;
          return obj;
        }, {} as Record<string, string>),
      formFields: extractedFieldsForAI,
    };

    try {
      // Call the background script to invoke AI
      // This assumes the AutofillPageClient is part of the extension popup
      if (!isExtension) {
        toast({ title: "Not in Extension", description: "AI autofill for sample form currently requires extension context to call background script.", variant: "destructive"});
        setIsProcessing(false);
        return;
      }

      chrome.runtime.sendMessage({ action: "callAiMapFields", payload: aiInput }, (response) => {
        setIsProcessing(false);
        if (chrome.runtime.lastError || !response || !response.success) {
          console.error('Error during AI mapping:', response ? response.error : 'Unknown error', chrome.runtime.lastError);
          toast({
            title: 'AI Autofill Error',
            description: `Could not map fields: ${response ? response.error : 'Unknown error'}. Check background script console.`,
            variant: 'destructive',
          });
          return;
        }

        const mappings = response.mappings;
        if (mappings.length === 0) {
          toast({
            title: 'No Mappings Found',
            description: 'The AI could not confidently map your data to the sample form fields.',
          });
        } else {
          mappings.forEach((mapping: { fieldName: string; value: string }) => {
            const fieldElement = document.getElementsByName(mapping.fieldName)[0] as HTMLInputElement | HTMLTextAreaElement;
            if (fieldElement) {
              fieldElement.value = mapping.value;
            }
          });
          toast({
            title: 'Sample Autofill Complete!',
            description: `${mappings.length} field(s) have been populated on the sample form.`,
          });
        }
      });
    } catch (error) {
      console.error('Error during AI mapping or autofill (sample form):', error);
      toast({
        title: 'Sample Autofill Error',
        description: 'An error occurred while trying to autofill the sample form.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const handleAutofillActiveTabPage = async () => {
    if (!isExtension) {
      toast({ title: "Functionality Unavailable", description: "Autofilling active tab page only works within the browser extension.", variant: "destructive"});
      return;
    }
    if (!defaultVaultData) {
       toast({ title: "No Default Vault", description: "Please set up your default vault data first.", variant: "destructive"});
       return;
    }

    setIsAutofillingActiveTab(true);
    chrome.runtime.sendMessage({ action: "autofillActiveTab" }, (response) => {
      setIsAutofillingActiveTab(false);
      if (chrome.runtime.lastError) {
        toast({ title: "Error", description: `Could not communicate with active tab: ${chrome.runtime.lastError.message}`, variant: "destructive"});
        return;
      }
      if (response) {
        if (response.status === "success") {
          toast({ title: "Autofill Sent!", description: response.message });
        } else if (response.status === "info") {
           toast({ title: "Autofill Info", description: response.message, variant: "default"});
        } else {
          toast({ title: "Autofill Failed on Page", description: response.message, variant: "destructive"});
        }
      } else {
         toast({ title: "Error", description: "No response from active tab autofill process.", variant: "destructive"});
      }
    });
  };
  
  const resetSampleForm = (event?: FormEvent<HTMLFormElement>) => {
    // Optional: if event is passed, prevent default if it's a submit type reset
    if (event) event.preventDefault(); 
    const form = document.getElementById('sampleForm') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    toast({ title: 'Sample Form Cleared', description: 'Sample form on this page has been reset.'});
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      {isExtension && (
          <Card className="shadow-xl border-2 border-accent/20 rounded-xl overflow-hidden mb-6">
            <CardHeader className="bg-gradient-to-br from-accent to-primary text-primary-foreground p-6">
                <CardTitle className="text-3xl font-headline flex items-center gap-3">
                    <FileCode className="w-8 h-8" />
                    Active Page Autofill
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 text-base">
                    Use AI to fill forms on the currently active browser tab.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                 {isLoadingVault ? (
                    <div className="mb-6 p-4 border rounded-lg bg-muted/50 text-center">
                    <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading default vault data...
                    </div>
                 ) : !defaultVaultData ? (
                    <div className="mb-6 p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive text-center">
                        No default vault data found. Please go to the Data Vault, create/select a vault, add your information, and ensure one is set as default.
                    </div>
                 ) : null}
                <Button 
                    onClick={handleAutofillActiveTabPage} 
                    disabled={isAutofillingActiveTab || !defaultVaultData || isLoadingVault}
                    className="w-full text-lg py-3 bg-accent hover:bg-accent/90"
                    size="lg"
                >
                    {isAutofillingActiveTab ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                    AI Autofill Active Page
                </Button>
            </CardContent>
          </Card>
      )}

      <Card className="shadow-xl border-2 border-primary/20 rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary to-accent/70 text-primary-foreground p-6">
          <CardTitle className="text-3xl font-headline flex items-center gap-3">
            <Wand2 className="w-8 h-8" />
             Autofill Tester (Sample Form)
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 text-base">
            Test AI form filling using data from your default vault on the sample form below.
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

          <form id="sampleForm" className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                onClick={handleAutofillSampleForm} 
                disabled={isProcessing || !defaultVaultData || isLoadingVault || !isExtension}
                className="w-full sm:w-auto text-lg py-3 bg-primary hover:bg-primary/90 flex-1"
                size="lg"
                title={!isExtension ? "Sample form AI autofill requires extension context" : ""}
              >
                {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                AI Autofill Sample Form
              </Button>
              <Button 
                type="button" 
                onClick={() => resetSampleForm()}
                variant="outline"
                className="w-full sm:w-auto text-lg py-3 flex-1"
                size="lg"
              >
                Clear Sample Form
              </Button>
            </div>
            {(!defaultVaultData && !isLoadingVault) && (
              <p className="text-sm text-destructive text-center mt-4">
                Please add your information in a vault and set it as default to use the Autofill feature.
              </p>
            )}
             {!isExtension && (
              <p className="text-sm text-orange-600 dark:text-orange-400 text-center mt-4 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-md">
                Note: You are viewing this outside of a browser extension. Active page autofill is disabled. AI autofill for the sample form also relies on extension features to call the local AI service.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
