
'use client';

import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UserData } from '@/types';
import { saveUserData, getUserData } from '@/lib/storage';
import { UserRound, Mail, Phone, Home, Building, Briefcase, Globe, Save, PlusCircle, Trash2 } from 'lucide-react';

const userDataSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  website: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')),
});

type UserDataFormValues = z.infer<typeof userDataSchema>;

interface CustomField {
  id: string; // For React key prop
  keyName: string;
  value: string;
}

export function DataVaultForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const form = useForm<UserDataFormValues>({
    resolver: zodResolver(userDataSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      jobTitle: '',
      website: '',
    },
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await getUserData();
      if (data) {
        const predefinedKeys = Object.keys(userDataSchema.shape);
        const loadedCustomFields: CustomField[] = [];
        const predefinedData: Partial<UserDataFormValues> = {};

        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            if (predefinedKeys.includes(key)) {
              predefinedData[key as keyof UserDataFormValues] = data[key];
            } else if (data[key] !== undefined && typeof data[key] === 'string') {
              loadedCustomFields.push({ id: `cf-${key}-${Date.now()}`, keyName: key, value: data[key] as string });
            }
          }
        }
        form.reset(predefinedData);
        setCustomFields(loadedCustomFields);
      }
      setIsLoading(false);
    };
    loadData();
  }, [form]);

  const addCustomField = () => {
    setCustomFields(prevFields => [...prevFields, { id: `cf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, keyName: '', value: '' }]);
  };

  const handleCustomFieldChange = (id: string, fieldType: 'keyName' | 'value', newValue: string) => {
    setCustomFields(prevFields =>
      prevFields.map(field =>
        field.id === id ? { ...field, [fieldType]: newValue } : field
      )
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(prevFields => prevFields.filter(field => field.id !== id));
  };

  const onSubmit: SubmitHandler<UserDataFormValues> = async (formData) => {
    const combinedData: UserData = { ...formData };

    customFields.forEach(field => {
      const trimmedKeyName = field.keyName.trim();
      if (trimmedKeyName) {
        combinedData[trimmedKeyName] = field.value;
      }
    });
    
    Object.keys(combinedData).forEach(key => {
      const typedKey = key as keyof UserData;
      if (combinedData[typedKey] === '' || combinedData[typedKey] === undefined) {
        delete combinedData[typedKey];
      }
    });

    try {
      await saveUserData(combinedData);
      toast({
        title: 'Success!',
        description: 'Your information has been saved securely.',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not save your data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center gap-2"><UserRound className="text-primary"/> Data Vault</CardTitle>
            <CardDescription>Loading your personal information...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Card className="shadow-xl border-2 border-primary/20 rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary to-accent text-primary-foreground p-6">
          <CardTitle className="text-3xl font-headline flex items-center gap-3">
            <UserRound className="w-8 h-8"/>
            Data Vault
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 text-base">
            Manage your personal information securely. This data will be used to help you autofill forms.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="p-6 space-y-6">
              {[
                { name: 'name', label: 'Full Name', icon: UserRound, placeholder: 'e.g. John Doe' },
                { name: 'email', label: 'Email Address', icon: Mail, placeholder: 'e.g. john.doe@example.com', type: 'email' },
                { name: 'phone', label: 'Phone Number', icon: Phone, placeholder: 'e.g. (123) 456-7890', type: 'tel' },
                { name: 'address', label: 'Home Address', icon: Home, placeholder: 'e.g. 123 Main St, Anytown, USA' },
                { name: 'company', label: 'Company', icon: Building, placeholder: 'e.g. Acme Corp' },
                { name: 'jobTitle', label: 'Job Title', icon: Briefcase, placeholder: 'e.g. Software Engineer' },
                { name: 'website', label: 'Website', icon: Globe, placeholder: 'e.g. https://example.com', type: 'url' },
              ].map((field) => (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name as keyof UserDataFormValues}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel htmlFor={field.name} className="text-base flex items-center gap-2">
                        <field.icon className="w-5 h-5 text-primary" />
                        {field.label}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          id={field.name}
                          placeholder={field.placeholder} 
                          type={field.type || 'text'}
                          className="text-base py-3 px-4 rounded-lg"
                          {...formField} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <div className="space-y-3 pt-4 border-t border-border mt-6">
                <Label className="text-base font-medium">Custom Fields</Label>
                {customFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No custom fields added yet. Click the button below to add one.</p>
                )}
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-muted/20">
                    <FormItem className="flex-1">
                      <Label htmlFor={`custom-key-${field.id}`} className="text-sm font-normal">Field Name</Label>
                      <Input
                        id={`custom-key-${field.id}`}
                        placeholder="e.g. Loyalty ID"
                        value={field.keyName}
                        onChange={(e) => handleCustomFieldChange(field.id, 'keyName', e.target.value)}
                        className="mt-1 text-sm py-2 px-3"
                      />
                    </FormItem>
                    <FormItem className="flex-1">
                      <Label htmlFor={`custom-value-${field.id}`} className="text-sm font-normal">Field Value</Label>
                      <Input
                        id={`custom-value-${field.id}`}
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => handleCustomFieldChange(field.id, 'value', e.target.value)}
                        className="mt-1 text-sm py-2 px-3"
                      />
                    </FormItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomField(field.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 h-9 w-9"
                      aria-label="Remove custom field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addCustomField}
                className="w-full mt-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Field
              </Button>
            </CardContent>
            <CardFooter className="bg-muted/50 p-6 border-t">
              <Button type="submit" size="lg" className="w-full text-lg py-3 bg-primary hover:bg-primary/90">
                <Save className="mr-2 h-5 w-5" /> Save Information
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
