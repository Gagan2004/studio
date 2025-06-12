
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { UserData, Vault } from '@/types';
import { getVaults, saveVault, deleteVault, setDefaultVault, getVaultById } from '@/lib/storage';
import { UserRound, Mail, Phone, Home, Building, Briefcase, Globe, Save, PlusCircle, Trash2, Edit3, Star, ShieldCheck } from 'lucide-react';

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
  id: string;
  keyName: string;
  value: string;
}

export function DataVaultForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [newVaultName, setNewVaultName] = useState('');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamingVaultId, setRenamingVaultId] = useState<string | null>(null);
  const [renamingVaultName, setRenamingVaultName] = useState('');


  const form = useForm<UserDataFormValues>({
    resolver: zodResolver(userDataSchema),
    defaultValues: {
      name: '', email: '', phone: '', address: '', company: '', jobTitle: '', website: '',
    },
  });

  const loadVaultsAndSetSelected = async (targetVaultId?: string | null) => {
    setIsLoading(true);
    const fetchedVaults = await getVaults();
    setVaults(fetchedVaults);

    let vaultToLoad: Vault | null = null;
    if (targetVaultId) {
      vaultToLoad = fetchedVaults.find(v => v.id === targetVaultId) || null;
    } else if (selectedVaultId) {
       vaultToLoad = fetchedVaults.find(v => v.id === selectedVaultId) || null;
    }
    
    if (!vaultToLoad) {
      vaultToLoad = fetchedVaults.find(v => v.isDefault) || (fetchedVaults.length > 0 ? fetchedVaults[0] : null);
    }
    
    if (vaultToLoad) {
      setSelectedVaultId(vaultToLoad.id);
      form.reset(vaultToLoad.data as UserDataFormValues);
      const predefinedKeys = Object.keys(userDataSchema.shape);
      const loadedCustomFields: CustomField[] = [];
      for (const key in vaultToLoad.data) {
        if (Object.prototype.hasOwnProperty.call(vaultToLoad.data, key) && !predefinedKeys.includes(key)) {
          if (vaultToLoad.data[key] !== undefined && typeof vaultToLoad.data[key] === 'string') {
             loadedCustomFields.push({ id: `cf-${key}-${Date.now()}`, keyName: key, value: vaultToLoad.data[key] as string });
          }
        }
      }
      setCustomFields(loadedCustomFields);
    } else {
      form.reset(form.formState.defaultValues); // Reset to empty if no vault
      setCustomFields([]);
      setSelectedVaultId(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadVaultsAndSetSelected();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial load

  const handleVaultChange = (vaultId: string) => {
    setSelectedVaultId(vaultId);
    const vault = vaults.find(v => v.id === vaultId);
    if (vault) {
      form.reset(vault.data as UserDataFormValues);
      const predefinedKeys = Object.keys(userDataSchema.shape);
      const loadedCustomFields: CustomField[] = [];
       for (const key in vault.data) {
         if (Object.prototype.hasOwnProperty.call(vault.data, key) && !predefinedKeys.includes(key)) {
           if (vault.data[key] !== undefined && typeof vault.data[key] === 'string') {
             loadedCustomFields.push({ id: `cf-${key}-${Date.now()}`, keyName: key, value: vault.data[key] as string });
           }
         }
       }
      setCustomFields(loadedCustomFields);
    } else {
        form.reset(form.formState.defaultValues);
        setCustomFields([]);
    }
  };

  const handleAddNewVault = async () => {
    if (!newVaultName.trim()) {
      toast({ title: "Vault Name Required", description: "Please enter a name for the new vault.", variant: "destructive" });
      return;
    }
    const newVaultData: UserData = {}; // Start with empty data
    const createdVault = await saveVault({ name: newVaultName, data: newVaultData, isDefault: vaults.length === 0 });
    await loadVaultsAndSetSelected(createdVault.id);
    setNewVaultName('');
    toast({ title: "Vault Created", description: `Vault "${createdVault.name}" has been created.` });
  };
  
  const handleRenameVault = async () => {
    if (!renamingVaultId || !renamingVaultName.trim()) {
      toast({ title: "Error", description: "Vault ID or new name is missing.", variant: "destructive" });
      return;
    }
    const vaultToRename = await getVaultById(renamingVaultId);
    if (vaultToRename) {
      await saveVault({ ...vaultToRename, name: renamingVaultName });
      await loadVaultsAndSetSelected(renamingVaultId);
      toast({ title: "Vault Renamed", description: `Vault is now named "${renamingVaultName}".` });
    }
    setIsRenameDialogOpen(false);
    setRenamingVaultId(null);
    setRenamingVaultName('');
  };

  const openRenameDialog = (vaultId: string, currentName: string) => {
    setRenamingVaultId(vaultId);
    setRenamingVaultName(currentName);
    setIsRenameDialogOpen(true);
  };


  const handleDeleteVault = async (vaultId: string) => {
    const vaultToDelete = vaults.find(v => v.id === vaultId);
    if (!vaultToDelete) return;

    await deleteVault(vaultId);
    toast({ title: "Vault Deleted", description: `Vault "${vaultToDelete.name}" has been deleted.` });
    // After deletion, load vaults and select default or first, or none if empty
    const updatedVaults = await getVaults();
    setVaults(updatedVaults);
    if (updatedVaults.length > 0) {
      const defaultVault = updatedVaults.find(v => v.isDefault) || updatedVaults[0];
      handleVaultChange(defaultVault.id);
    } else {
      setSelectedVaultId(null);
      form.reset(form.formState.defaultValues);
      setCustomFields([]);
    }
  };

  const handleSetDefaultVault = async (vaultId: string) => {
    await setDefaultVault(vaultId);
    await loadVaultsAndSetSelected(vaultId);
    toast({ title: "Default Vault Set", description: `Vault "${vaults.find(v=>v.id===vaultId)?.name}" is now the default.` });
  };

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
      let vaultToSave: Vault;
      if (selectedVaultId) {
        const existingVault = vaults.find(v => v.id === selectedVaultId);
        if (!existingVault) throw new Error("Selected vault not found for saving.");
        vaultToSave = { ...existingVault, data: combinedData };
      } else {
        // Create a new vault if none is selected (e.g., first use)
        vaultToSave = { 
            name: 'Default Vault', 
            data: combinedData, 
            isDefault: true, 
            id: `vault-${Date.now()}`, 
            createdAt: Date.now(), 
            updatedAt: Date.now() 
        };
      }
      
      const saved = await saveVault(vaultToSave);
      await loadVaultsAndSetSelected(saved.id); // Reload vaults and re-select
      toast({
        title: 'Success!',
        description: `Information in vault "${saved.name}" has been saved.`,
      });
    } catch (error) {
      console.error(error);
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
          <CardHeader><CardTitle className="text-2xl font-headline flex items-center gap-2"><ShieldCheck className="text-primary"/> Data Vault</CardTitle><CardDescription>Loading your personal information...</CardDescription></CardHeader>
          <CardContent className="space-y-4 pt-6"><div className="h-10 bg-muted rounded-md animate-pulse"></div><div className="h-10 bg-muted rounded-md animate-pulse"></div><div className="h-10 bg-muted rounded-md animate-pulse"></div></CardContent>
        </Card>
      </div>
    );
  }

  const currentSelectedVault = vaults.find(v => v.id === selectedVaultId);

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Card className="shadow-xl border-2 border-primary/20 rounded-xl overflow-hidden mb-6">
        <CardHeader className="bg-gradient-to-br from-primary to-accent text-primary-foreground p-6">
          <CardTitle className="text-3xl font-headline flex items-center gap-3"><ShieldCheck className="w-8 h-8"/>Manage Vaults</CardTitle>
          <CardDescription className="text-primary-foreground/80 text-base">Select, create, or manage your data vaults.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <Label htmlFor="vault-select" className="text-base">Current Vault</Label>
              <Select value={selectedVaultId || ""} onValueChange={handleVaultChange} disabled={vaults.length === 0}>
                <SelectTrigger id="vault-select" className="mt-1 text-base py-3 px-4 rounded-lg">
                  <SelectValue placeholder="Select a vault" />
                </SelectTrigger>
                <SelectContent>
                  {vaults.map(vault => (
                    <SelectItem key={vault.id} value={vault.id}>
                      {vault.name} {vault.isDefault && "(Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedVaultId && currentSelectedVault && (
              <>
                <Button variant="outline" size="icon" onClick={() => openRenameDialog(selectedVaultId, currentSelectedVault.name)} title="Rename Vault">
                  <Edit3 className="w-4 h-4"/>
                </Button>
                {!currentSelectedVault.isDefault && (
                  <Button variant="outline" size="icon" onClick={() => handleSetDefaultVault(selectedVaultId)} title="Set as Default">
                    <Star className="w-4 h-4"/>
                  </Button>
                )}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" title="Delete Vault" disabled={vaults.length <= 1 && currentSelectedVault.isDefault}>
                        <Trash2 className="w-4 h-4"/>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the vault "{currentSelectedVault.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteVault(selectedVaultId)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </>
            )}
          </div>
          <div className="flex items-end gap-2 border-t pt-4">
            <div className="flex-grow">
              <Label htmlFor="new-vault-name" className="text-base">New Vault Name</Label>
              <Input id="new-vault-name" placeholder="e.g., Work Profile" value={newVaultName} onChange={e => setNewVaultName(e.target.value)} className="mt-1 text-base py-3 px-4 rounded-lg" />
            </div>
            <Button onClick={handleAddNewVault}><PlusCircle className="mr-2 w-4 h-4" /> Add Vault</Button>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Vault</AlertDialogTitle>
            <AlertDialogDescription>Enter a new name for the vault.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input 
            value={renamingVaultName} 
            onChange={(e) => setRenamingVaultName(e.target.value)}
            placeholder="New vault name"
            className="my-4"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRenamingVaultId(null); setRenamingVaultName(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameVault}>Rename</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {selectedVaultId && currentSelectedVault ? (
        <Card className="shadow-xl border-2 border-primary/20 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-primary to-accent text-primary-foreground p-6">
            <CardTitle className="text-3xl font-headline flex items-center gap-3">
              <UserRound className="w-8 h-8"/> Data Vault: {currentSelectedVault.name} {currentSelectedVault.isDefault && <span className="text-sm">(Default)</span>}
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 text-base">
              Manage personal information for this vault. This data will be used to help you autofill forms.
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomField(field.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 h-9 w-9" aria-label="Remove custom field" >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" onClick={addCustomField} className="w-full mt-2">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Another Field
                </Button>
              </CardContent>
              <CardFooter className="bg-muted/50 p-6 border-t">
                <Button type="submit" size="lg" className="w-full text-lg py-3 bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-5 w-5" /> Save Information to "{currentSelectedVault.name}"
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      ) : (
         <Card className="shadow-xl border-2 border-primary/20 rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-primary to-accent text-primary-foreground p-6">
                <CardTitle className="text-3xl font-headline flex items-center gap-3">
                <UserRound className="w-8 h-8"/> Data Vault
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
                <p className="text-muted-foreground text-lg mb-4">No vault selected or no vaults exist.</p>
                <p className="text-sm mb-4">Create a new vault above, or if you have existing vaults, select one to manage its data.</p>
                <p className="text-sm">If this is your first time, typing data below and clicking "Save Information" will create a "Default Vault" for you.</p>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 text-left">
                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field: formField }) => (
                                <FormItem className="mb-4">
                                <FormLabel htmlFor="default-name" className="text-base flex items-center gap-2">
                                    <UserRound className="w-5 h-5 text-primary" />
                                    Full Name
                                </FormLabel>
                                <FormControl>
                                    <Input id="default-name" placeholder="e.g. John Doe" className="text-base py-3 px-4 rounded-lg" {...formField} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="lg" className="w-full text-lg py-3 bg-primary hover:bg-primary/90">
                            <Save className="mr-2 h-5 w-5" /> Save Information & Create Vault
                        </Button>
                    </form>
                </Form>
            </CardContent>
         </Card>
      )}
    </div>
  );
}
