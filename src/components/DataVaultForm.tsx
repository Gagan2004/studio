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
import { UserRound, Mail, Phone, Home, Building, Briefcase, Globe, Save } from 'lucide-react';

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

export function DataVaultForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

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
        form.reset(data as UserDataFormValues);
      }
      setIsLoading(false);
    };
    loadData();
  }, [form]);

  const onSubmit: SubmitHandler<UserDataFormValues> = async (data) => {
    try {
      await saveUserData(data as UserData);
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
          <CardContent className="space-y-4">
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
