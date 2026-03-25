import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item wrapper
const SortableItem = ({ id, children, onRemove, collapsible, title }) => {
  const [expanded, setExpanded] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="bg-white border border-slate-200 rounded-lg mb-3"
    >
      <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50 rounded-t-lg">
        <button
          type="button"
          className="cursor-grab hover:bg-slate-200 p-1 rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} className="text-slate-400" />
        </button>
        
        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="hover:bg-slate-200 p-1 rounded"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        
        <span className="text-sm font-medium text-slate-700 flex-1">{title}</span>
        
        <button
          type="button"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      {(!collapsible || expanded) && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};

// Main ListEditor component
const ListEditor = ({
  items = [],
  onChange,
  renderItem,
  defaultItem = {},
  addLabel = 'Add Item',
  itemTitle = (item, index) => `Item ${index + 1}`,
  collapsible = true,
  maxItems = 50
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ensure all items have unique IDs
  const itemsWithIds = items.map((item, index) => ({
    ...item,
    _id: item._id || `item-${index}-${Date.now()}`
  }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = itemsWithIds.findIndex(item => item._id === active.id);
      const newIndex = itemsWithIds.findIndex(item => item._id === over.id);
      
      const newItems = arrayMove(itemsWithIds, oldIndex, newIndex);
      onChange(newItems.map(({ _id, ...rest }) => rest));
    }
  };

  const handleAdd = () => {
    if (items.length >= maxItems) return;
    onChange([...items, { ...defaultItem, _id: `new-${Date.now()}` }]);
  };

  const handleRemove = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const handleItemChange = (index, updates) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={itemsWithIds.map(item => item._id)}
          strategy={verticalListSortingStrategy}
        >
          {itemsWithIds.map((item, index) => (
            <SortableItem
              key={item._id}
              id={item._id}
              onRemove={() => handleRemove(index)}
              collapsible={collapsible}
              title={itemTitle(item, index)}
            >
              {renderItem(item, index, (updates) => handleItemChange(index, updates))}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      {items.length < maxItems && (
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="w-full border-dashed"
        >
          <Plus size={16} className="mr-2" />
          {addLabel}
        </Button>
      )}

      {items.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No items yet. Click "{addLabel}" to add one.
        </div>
      )}
    </div>
  );
};

export default ListEditor;
