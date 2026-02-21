"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function Subscriptions() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [subToDelete, setSubToDelete] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [newSub, setNewSub] = useState({ name: '', provider: '', cost: '', type: 'API Key' })

  const subscriptionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'aiSubscriptions'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: subscriptions, isLoading } = useCollection(subscriptionsQuery);

  const handleAddSub = () => {
    if (!user || !firestore || !newSub.name) return;

    const colRef = collection(firestore, 'users', user.uid, 'aiSubscriptions');
    addDocumentNonBlocking(colRef, {
      userProfileId: user.uid,
      aiProductOfferingId: 'manual-entry',
      name: newSub.name,
      customName: newSub.name,
      providerName: newSub.provider,
      subscriptionType: newSub.type,
      monthlyFixedCost: parseFloat(newSub.cost) || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setNewSub({ name: '', provider: '', cost: '', type: 'API Key' });
    setIsAddOpen(false);
  }

  const handleDeleteSub = () => {
    if (!user || !firestore || !subToDelete || deleteConfirmText.toLowerCase() !== 'delete') return;
    
    const docRef = doc(firestore, 'users', user.uid, 'aiSubscriptions', subToDelete);
    deleteDocumentNonBlocking(docRef);
    
    setIsDeleteOpen(false);
    setSubToDelete(null);
    setDeleteConfirmText("");
  }

  const getShortDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Subscription Hub</h1>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 font-headline font-bold">
                <Plus size={16} /> Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-headline text-xl">Add AI Subscription</DialogTitle>
                <DialogDescription>Enter the details of your AI tool subscription.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tool Name</Label>
                  <Input id="name" value={newSub.name} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} placeholder="e.g. GPT-4 Pro" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Input id="provider" value={newSub.provider} onChange={(e) => setNewSub({ ...newSub, provider: e.target.value })} placeholder="e.g. OpenAI" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost">Monthly Cost ($)</Label>
                  <Input id="cost" type="number" value={newSub.cost} onChange={(e) => setNewSub({ ...newSub, cost: e.target.value })} placeholder="20.00" />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={newSub.type} onValueChange={(v) => setNewSub({ ...newSub, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="API Key">API Key</SelectItem>
                      <SelectItem value="Web UI Plan">Web UI Plan</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddSub} className="font-headline font-bold">Save Subscription</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-headline">Active Subscriptions</CardTitle>
              <CardDescription>Consolidated view of all your recurring AI costs.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-widest text-muted-foreground">
                      <TableHead className="w-[200px]">Tool Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Monthly Cost</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Added Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions?.map((sub) => (
                      <TableRow key={sub.id} className="group transition-colors">
                        <TableCell className="font-bold text-primary">{sub.customName || sub.name}</TableCell>
                        <TableCell className="text-muted-foreground">{sub.providerName || sub.provider}</TableCell>
                        <TableCell className="font-headline font-semibold text-foreground">${sub.monthlyFixedCost.toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] font-bold">{sub.subscriptionType}</Badge></TableCell>
                        <TableCell className="text-xs">{getShortDate(sub.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-destructive font-bold focus:text-destructive gap-2 cursor-pointer"
                                onClick={() => {
                                  setSubToDelete(sub.id);
                                  setIsDeleteOpen(true);
                                }}
                              >
                                <Trash2 size={14} /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!subscriptions?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                          No subscriptions found. Click "Add Subscription" to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>

        <Dialog open={isDeleteOpen} onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setSubToDelete(null);
            setDeleteConfirmText("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline text-xl text-destructive flex items-center gap-2">
                <Trash2 /> Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                This action is permanent. To confirm, please type <span className="font-bold text-foreground">delete</span> below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input 
                value={deleteConfirmText} 
                onChange={(e) => setDeleteConfirmText(e.target.value)} 
                placeholder="Type 'delete' here..."
                className="font-medium"
              />
            </div>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setIsDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                onClick={handleDeleteSub}
                className="font-headline font-bold"
              >
                Delete Subscription
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
