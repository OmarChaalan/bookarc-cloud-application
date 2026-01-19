// src/components/AddToListButton.tsx
// COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { Plus, Check, Loader2, BookMarked } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import { listBookService } from '../services/listBookService';

interface UserList {
  list_id: number;
  name: string;
  title?: string;
  visibility: 'public' | 'private';
  book_count?: number;
  is_added?: boolean;
  added_at?: string;
}

interface AddToListButtonProps {
  bookId: number;
  bookTitle: string;
  isUserLoggedIn: boolean;
  onLoginRequired?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function AddToListButton({
  bookId,
  bookTitle,
  isUserLoggedIn,
  onLoginRequired,
  variant = 'outline',
  size = 'default',
  className = '',
}: AddToListButtonProps) {
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingListId, setProcessingListId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserLoggedIn && open) {
      loadLists();
    }
  }, [isUserLoggedIn, open, bookId]);

  const loadLists = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📚 Loading lists for book:', bookId);

      // Use the NEW endpoint that returns all lists with is_added flag
      const response = await listBookService.getBookLists(bookId);
      
      console.log('✅ Lists loaded:', response);

      if (response.lists && Array.isArray(response.lists)) {
        setUserLists(response.lists);
        console.log(`📊 Set ${response.lists.length} lists`);
      } else {
        console.warn('⚠️ Invalid response structure:', response);
        setUserLists([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to load lists:', error);
      setError('Failed to load your lists');
      toast.error('Failed to load your lists');
      setUserLists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleListToggle = async (list: UserList) => {
    if (!isUserLoggedIn) {
      onLoginRequired?.();
      return;
    }

    const isInList = list.is_added;
    const listName = getListDisplayName(list);
    
    setProcessingListId(list.list_id);

    try {
      if (isInList) {
        // Remove from list
        await listBookService.removeBookFromList(list.list_id, bookId);
        
        // Update local state
        setUserLists(prev => prev.map(l => 
          l.list_id === list.list_id 
            ? { ...l, is_added: false, added_at: undefined } 
            : l
        ));
        
        toast.success(`Removed "${bookTitle}" from ${listName}`);
      } else {
        // Add to list
        await listBookService.addBookToList(list.list_id, bookId);
        
        // Update local state
        setUserLists(prev => prev.map(l => 
          l.list_id === list.list_id 
            ? { ...l, is_added: true, added_at: new Date().toISOString() } 
            : l
        ));
        
        toast.success(`Added "${bookTitle}" to ${listName}`);
      }
    } catch (error: any) {
      console.error('Failed to update list:', error);
      toast.error(error.message || 'Failed to update list');
    } finally {
      setProcessingListId(null);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isUserLoggedIn && newOpen) {
      onLoginRequired?.();
      return;
    }
    setOpen(newOpen);
  };

  const getListDisplayName = (list: UserList): string => {
    if (list.name === 'Custom' && list.title) {
      return list.title;
    }
    return list.name;
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Plus className="mr-2 h-4 w-4" />
          Add to List
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <BookMarked className="h-4 w-4" />
          Add to List
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="px-2 py-4 text-center text-sm text-destructive">
            {error}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadLists}
              className="mt-2 w-full"
            >
              Try Again
            </Button>
          </div>
        ) : userLists.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No lists available
          </div>
        ) : (
          userLists.map((list) => {
            const isInList = list.is_added || false;
            const isProcessing = processingListId === list.list_id;

            return (
              <DropdownMenuItem
                key={list.list_id}
                onClick={() => handleListToggle(list)}
                disabled={isProcessing}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="flex-1">{getListDisplayName(list)}</span>
                  <div className="flex items-center gap-2">
                    {list.book_count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({list.book_count})
                      </span>
                    )}
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isInList ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : null}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}