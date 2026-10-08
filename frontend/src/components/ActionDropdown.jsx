import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MoreVertical } from 'lucide-react';

/**
 * Universal, clean ActionDropdown component for tables and lists.
 * Uses React Portal with fixed positioning to prevent clipping inside scrollable tables (overflow-x-auto).
 */
export default function ActionDropdown({
  label = 'Actions',
  icon: TriggerIcon = null,
  items = [],
  variant = 'default', // 'default', 'subtle', 'dots', 'primary'
  size = 'sm', // 'xs', 'sm', 'md'
  align = 'right', // 'right' or 'left'
  menuWidth = 220,
  className = '',
  disabled = false,
  title = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = menuWidth;
    const estHeight = 300;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < estHeight && spaceAbove > spaceBelow;

    const top = openUpward ? rect.top - 6 : rect.bottom + 6;

    let left = align === 'right' ? rect.right - width : rect.left;
    // Boundary checks to stay inside viewport
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({
      top,
      left,
      openUpward
    });
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) return;

    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleWindowScroll = (e) => {
      // If scroll occurs within the dropdown menu itself, don't close
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('touchstart', handleOutsideClick, true);
    window.addEventListener('scroll', handleWindowScroll, true);
    window.addEventListener('resize', handleWindowScroll);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('touchstart', handleOutsideClick, true);
      window.removeEventListener('scroll', handleWindowScroll, true);
      window.removeEventListener('resize', handleWindowScroll);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Clean and filter items
  const visibleItems = items.filter(Boolean).filter(item => !item.hidden);

  // If no items at all, don't render or render disabled
  if (visibleItems.length === 0) {
    return null;
  }

  // Group filter: remove trailing or consecutive dividers
  const sanitizedItems = [];
  let lastWasDivider = true; // prevent divider at start
  visibleItems.forEach((item, idx) => {
    if (item.divider) {
      if (!lastWasDivider && idx < visibleItems.length - 1) {
        sanitizedItems.push(item);
        lastWasDivider = true;
      }
    } else {
      sanitizedItems.push(item);
      lastWasDivider = false;
    }
  });

  // Size styling
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[11px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-2'
  }[size] || 'px-2.5 py-1 text-xs gap-1.5';

  // Variant styling for trigger button
  let variantClasses = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600';
  if (variant === 'subtle') {
    variantClasses = 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent';
  } else if (variant === 'primary') {
    variantClasses = 'bg-teal-600 text-white hover:bg-teal-700 border border-teal-700 shadow-xs';
  } else if (variant === 'dots') {
    variantClasses = 'p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent';
  }

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        disabled={disabled}
        onClick={toggleDropdown}
        className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
          variant === 'dots' ? 'p-1' : sizeClasses
        } ${variantClasses} ${isOpen ? 'ring-2 ring-teal-500/40 border-teal-500/50' : ''} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {TriggerIcon && <TriggerIcon className="h-3.5 w-3.5 shrink-0" />}
        {variant !== 'dots' && <span>{label}</span>}
        {variant === 'dots' ? (
          <MoreVertical className="h-4 w-4" />
        ) : (
          <ChevronDown
            className={`h-3 w-3 opacity-60 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-teal-600 dark:text-teal-400 opacity-100' : ''
            }`}
          />
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.openUpward ? 'translateY(-100%)' : 'none',
              width: `${menuWidth}px`,
              zIndex: 99999,
              maxHeight: 'min(440px, calc(100vh - 24px))'
            }}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/90 dark:border-slate-700/80 py-1.5 overflow-y-auto text-xs animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {sanitizedItems.map((item, index) => {
              if (item.header) {
                return (
                  <div
                    key={`header-${index}`}
                    className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none flex items-center justify-between"
                  >
                    <span>{item.header}</span>
                    {item.headerBadge && (
                      <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {item.headerBadge}
                      </span>
                    )}
                  </div>
                );
              }

              if (item.divider) {
                return (
                  <div
                    key={`div-${index}`}
                    className="my-1 border-t border-slate-100 dark:border-slate-800/80"
                  />
                );
              }

              const Icon = (typeof item.icon === 'function' && item.icon !== (typeof window !== 'undefined' ? window.History : null)) ? item.icon : null;

              return (
                <button
                  key={item.key || `item-${index}`}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (item.disabled) return;
                    setIsOpen(false);
                    if (item.onClick) item.onClick(e);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none group ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : item.danger
                      ? 'hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      : 'hover:bg-teal-50/60 dark:hover:bg-teal-950/30 text-slate-700 dark:text-slate-200 hover:text-teal-900 dark:hover:text-teal-200'
                  }`}
                  title={item.tooltip || item.label}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {Icon && (
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                          item.iconColor ||
                          (item.danger
                            ? 'text-rose-500 group-hover:text-rose-600'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400')
                        }`}
                      />
                    )}
                    <div className="truncate">
                      <span className="font-semibold text-xs block leading-tight">
                        {item.label}
                      </span>
                      {item.subLabel && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">
                          {item.subLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 tracking-wide ${
                        item.badgeColor ||
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
