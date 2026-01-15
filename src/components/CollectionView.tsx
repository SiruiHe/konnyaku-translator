import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProcessorResult } from '../services/ILLMProvider';
import { loadCollectionItems, saveCollectionItems, trimCollectionItems } from '../utils/collection';

type SavedItem = ProcessorResult & {
    id: number;
    date: string;
    key?: string;
    pinned?: boolean;
};

interface Props {
    onRecycle: (item: SavedItem) => void;
}

interface SortableItemProps {
    item: SavedItem;
    manageMode: boolean;
    selected: boolean;
    onToggleSelect: (id: number) => void;
    onRecycle: (item: SavedItem) => void;
    onDelete: (id: number) => void;
    onTogglePin: (id: number) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
    item,
    manageMode,
    selected,
    onToggleSelect,
    onRecycle,
    onDelete,
    onTogglePin,
}) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
        useSortable({ id: item.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : 'transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1)',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-item-id={item.id}
            className={`group bg-stone-50 dark:bg-neutral-800 border ${selected ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-stone-200 dark:border-neutral-700'} ${isDragging ? 'opacity-70 shadow-lg' : ''} p-4 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-md transition-all flex justify-between items-center`}
            onClick={() => {
                if (manageMode) {
                    onToggleSelect(item.id);
                } else {
                    onRecycle(item);
                }
            }}
        >
            <div className="flex items-start gap-3 flex-1 min-w-0">
                {manageMode && (
                    <div className="pt-1">
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleSelect(item.id)}
                            className="w-4 h-4 text-blue-500"
                        />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    {item.type === 'dictionary' ? (
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-lg text-stone-800 dark:text-stone-100">{item.data.word}</span>
                                <span className="text-xs font-mono text-stone-400">{item.data.partsOfSpeech}</span>
                            </div>
                            <p className="text-stone-600 dark:text-stone-400 text-sm truncate">{item.data.definition}</p>
                        </div>
                    ) : (
                        <p className="text-stone-700 dark:text-stone-300 text-sm line-clamp-2">{item.text}</p>
                    )}
                    <div className="text-[10px] text-stone-400 mt-2 font-mono">{new Date(item.date).toLocaleDateString()}</div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    className={`p-2 ${item.pinned ? 'text-yellow-500' : 'text-stone-300 hover:text-yellow-500'} transition-colors`}
                    onClick={(e) => { e.stopPropagation(); onTogglePin(item.id); }}
                    title={item.pinned ? 'Unpin' : 'Pin'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={item.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /><path d="M5 9h14l-1 7H6L5 9z" /></svg>
                </button>
                <button
                    className="p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    title="Remove"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                </button>
                <span
                    ref={setActivatorNodeRef}
                    className="text-stone-400 cursor-grab select-none touch-none px-1"
                    title="Drag to reorder"
                    onClick={(event) => event.stopPropagation()}
                    {...attributes}
                    {...listeners}
                >
                    ⋮⋮
                </span>
            </div>
        </div>
    );
};

const DragOverlayCard: React.FC<{ item: SavedItem; width?: number; height?: number }> = ({ item, width, height }) => {
    return (
        <div
            className="bg-stone-50 dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 p-4 rounded-xl shadow-xl"
            style={{
                width: width ?? undefined,
                height: height ?? undefined,
            }}
        >
            {item.type === 'dictionary' ? (
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-bold text-lg text-stone-800 dark:text-stone-100">{item.data.word}</span>
                        <span className="text-xs font-mono text-stone-400">{item.data.partsOfSpeech}</span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 text-sm truncate">{item.data.definition}</p>
                </div>
            ) : (
                <p className="text-stone-700 dark:text-stone-300 text-sm line-clamp-2">{item.text}</p>
            )}
        </div>
    );
};

const CollectionView: React.FC<Props> = ({ onRecycle }) => {
    const [items, setItems] = useState<SavedItem[]>([]);
    const [manageMode, setManageMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [activeId, setActiveId] = useState<number | null>(null);
    const activeRectRef = useRef<{ width: number; height: number } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor)
    );

    useEffect(() => {
        try {
            const loaded = loadCollectionItems<SavedItem>();
            const trimmed = trimCollectionItems(loaded);
            setItems(trimmed);
            if (trimmed.length !== loaded.length) {
                saveCollectionItems(trimmed);
            }
        } catch (e) {
            console.error('Failed to load collection', e);
        }
    }, []);

    useEffect(() => {
        setSelectedIds((prev) => {
            if (prev.size === 0) return prev;
            const next = new Set<number>();
            for (const id of prev) {
                if (items.some((item) => item.id === id)) {
                    next.add(id);
                }
            }
            return next;
        });
    }, [items]);

    const persistItems = (nextItems: SavedItem[]) => {
        setItems(nextItems);
        saveCollectionItems(nextItems);
    };

    const handleDelete = (id: number) => {
        const updated = items.filter(i => i.id !== id);
        persistItems(updated);
    };

    const toggleSelection = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        setSelectedIds(new Set(items.map((item) => item.id)));
    };

    const handleSelectNone = () => {
        setSelectedIds(new Set());
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        const updated = items.filter((item) => !selectedIds.has(item.id));
        persistItems(updated);
        setSelectedIds(new Set());
    };

    const handleTogglePin = (id: number) => {
        setItems((prev) => {
            const index = prev.findIndex((item) => item.id === id);
            if (index === -1) return prev;
            const next = [...prev];
            const [current] = next.splice(index, 1);
            const updatedItem = { ...current, pinned: !current.pinned };
            if (updatedItem.pinned) {
                next.unshift(updatedItem);
            } else {
                const firstUnpinned = next.findIndex((item) => !item.pinned);
                const insertIndex = firstUnpinned === -1 ? next.length : firstUnpinned;
                next.splice(insertIndex, 0, updatedItem);
            }
            saveCollectionItems(next);
            return next;
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        const nextId = Number(event.active.id);
        setActiveId(nextId);
        const initialRect = event.active.rect.current?.initial;
        activeRectRef.current = initialRect
            ? { width: initialRect.width, height: initialRect.height }
            : null;
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        activeRectRef.current = null;
        if (!over || active.id === over.id) return;
        const fromIndex = items.findIndex((item) => item.id === Number(active.id));
        const toIndex = items.findIndex((item) => item.id === Number(over.id));
        if (fromIndex === -1 || toIndex === -1) return;

        const fromPinned = Boolean(items[fromIndex].pinned);
        const toPinned = Boolean(items[toIndex].pinned);
        if (fromPinned !== toPinned) return;

        const reordered = arrayMove(items, fromIndex, toIndex);
        persistItems(reordered);
    };

    const ids = useMemo(() => items.map((item) => item.id), [items]);
    const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);
    const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Library</h2>
                <button
                    onClick={() => {
                        setManageMode((prev) => !prev);
                        setSelectedIds(new Set());
                    }}
                    className="px-3 py-1.5 text-sm text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-neutral-700 rounded-md hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors"
                >
                    {manageMode ? 'Done' : 'Manage'}
                </button>
            </div>

            {manageMode && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button
                        onClick={handleSelectAll}
                        className="px-3 py-1.5 text-sm text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-neutral-800 rounded-md hover:bg-stone-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                        Select All
                    </button>
                    <button
                        onClick={handleSelectNone}
                        className="px-3 py-1.5 text-sm text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-neutral-800 rounded-md hover:bg-stone-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                        Select None
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        className="px-3 py-1.5 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                        disabled={selectedCount === 0}
                    >
                        Delete Selected {selectedCount > 0 ? `(${selectedCount})` : ''}
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-stone-400">
                        <span className="text-4xl mb-2">📭</span>
                        <p>No saved items yet.</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => {
                            setActiveId(null);
                            activeRectRef.current = null;
                        }}
                    >
                        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                            {items.map((item) => (
                                <SortableItem
                                    key={item.id}
                                    item={item}
                                    manageMode={manageMode}
                                    selected={selectedIds.has(item.id)}
                                    onToggleSelect={toggleSelection}
                                    onRecycle={onRecycle}
                                    onDelete={handleDelete}
                                    onTogglePin={handleTogglePin}
                                />
                            ))}
                        </SortableContext>
                        <DragOverlay
                            adjustScale={false}
                            dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }}
                        >
                            {activeItem ? (
                                <DragOverlayCard
                                    item={activeItem}
                                    width={activeRectRef.current?.width}
                                    height={activeRectRef.current?.height}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>
        </div>
    );
};

export default CollectionView;
