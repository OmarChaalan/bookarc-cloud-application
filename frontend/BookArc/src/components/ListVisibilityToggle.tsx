import React from 'react';
import { Globe, Lock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

interface ListVisibilityToggleProps {
  listId: number;
  isPublic: boolean;
  onToggle: (listId: number, newVisibility: 'public' | 'private') => Promise<void>;
  disabled?: boolean;
}

export function ListVisibilityToggle({ 
  listId, 
  isPublic, 
  onToggle, 
  disabled = false 
}: ListVisibilityToggleProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleToggle = async (visibility: 'public' | 'private') => {
    setIsLoading(true);
    try {
      await onToggle(listId, visibility);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
          disabled={disabled || isLoading}
        >
          {isPublic ? (
            <Globe className="w-3 h-3 text-green-600 dark:text-green-400" />
          ) : (
            <Lock className="w-3 h-3 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleToggle('public')}
          disabled={isLoading}
        >
          <Globe className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
          Public
          {isPublic && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleToggle('private')}
          disabled={isLoading}
        >
          <Lock className="w-4 h-4 mr-2" />
          Private
          {!isPublic && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}