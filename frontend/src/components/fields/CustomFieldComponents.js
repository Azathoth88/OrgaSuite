import React from 'react';

/**
 * Text Field Component
 */
export const TextFieldComponent = ({ field, value, onChange, error }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
        placeholder={field.description || ''}
        required={field.required}
      />
      {field.description && !error && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Textarea Field Component
 */
export const TextareaFieldComponent = ({ field, value, onChange, error }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={field.rows || 4}
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
        placeholder={field.description || ''}
        required={field.required}
      />
      {field.description && !error && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Number Field Component
 */
export const NumberFieldComponent = ({ field, value, onChange, error }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
        min={field.min}
        max={field.max}
        step={field.step || 1}
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
        placeholder={field.description || ''}
        required={field.required}
      />
      {field.description && !error && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Date Field Component
 */
export const DateFieldComponent = ({ field, value, onChange, error }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
        required={field.required}
      />
      {field.description && !error && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Checkbox Field Component
 */
export const CheckboxFieldComponent = ({ field, value, onChange, error }) => {
  return (
    <div>
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
        />
        <label className="text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
      {field.description && !error && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Select Field Component
 */
export const SelectFieldComponent = ({ field, value, onChange, error }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
        required={field.required}
      >
        <option value="">Bitte wählen...</option>
        {(field.options || []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.description && !error && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Multiselect Field Component
 */
export const MultiselectFieldComponent = ({ field, value, onChange, error }) => {
  const selectedValues = Array.isArray(value) ? value : [];

  const handleChange = (optionValue) => {
    let newValue;
    if (selectedValues.includes(optionValue)) {
      newValue = selectedValues.filter(v => v !== optionValue);
    } else {
      newValue = [...selectedValues, optionValue];
    }
    onChange(newValue);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className={`border rounded-lg p-3 space-y-2 ${
        error ? 'border-red-300 bg-red-50' : 'border-gray-300'
      }`}>
        {(field.options || []).map((option) => (
          <label key={option.value} className="flex items-center">
            <input
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              onChange={() => handleChange(option.value)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span className="text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
      {selectedValues.length > 0 && (
        <div className="mt-2">
          <div className="text-sm text-gray-600">Ausgewählt:</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedValues.map((val) => {
              const option = field.options?.find(o => o.value === val);
              return (
                <span key={val} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {option?.label || val}
                  <button
                    onClick={() => handleChange(val)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
      {field.description && !error && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Multi-Entry Field Component (Perfect for Breeding Species + Remarks)
 */
export const MultiEntryFieldComponent = ({ field, value, onChange, error }) => {
  const entries = Array.isArray(value) ? value : [];
  
  const addEntry = () => {
    const newEntries = [...entries, { selection: '', remark: '' }];
    onChange(newEntries);
  };

  const updateEntry = (index, key, newValue) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [key]: newValue };
    onChange(newEntries);
  };

  const removeEntry = (index) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className={`border rounded-lg p-4 space-y-3 ${
        error ? 'border-red-300 bg-red-50' : 'border-gray-300'
      }`}>
        {entries.map((entry, index) => (
          <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded border">
            <div className="flex-1">
              <select
                value={entry.selection || ''}
                onChange={(e) => updateEntry(index, 'selection', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Bitte wählen...</option>
                {(field.entryConfig?.baseOptions || []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <input
                type="text"
                value={entry.remark || ''}
                onChange={(e) => updateEntry(index, 'remark', e.target.value)}
                placeholder={field.entryConfig?.remarkLabel || 'Bemerkung'}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={() => removeEntry(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              title="Eintrag entfernen"
            >
              🗑️
            </button>
          </div>
        ))}
        
        <button
          onClick={addEntry}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          ➕ {field.entryConfig?.addButtonText || 'Eintrag hinzufügen'}
        </button>
      </div>
      
      {field.description && !error && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Preview of current entries */}
      {entries.length > 0 && (
        <div className="mt-2">
          <div className="text-sm text-gray-600 mb-1">Aktuelle Einträge:</div>
          <div className="space-y-1">
            {entries.map((entry, index) => {
              const option = field.entryConfig?.baseOptions?.find(o => o.value === entry.selection);
              return entry.selection ? (
                <div key={index} className="text-sm bg-blue-50 text-blue-800 p-2 rounded">
                  <strong>{option?.label || entry.selection}</strong>
                  {entry.remark && <span> - {entry.remark}</span>}
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Multi-Entry Date Field Component (Datum + Bemerkung)
 * Perfekt für Termine, Ereignisse, etc.
 */
export const MultiEntryDateFieldComponent = ({ field, value, onChange, error }) => {
  const entries = Array.isArray(value) ? value : [];
  
  const addEntry = () => {
    const newEntries = [...entries, { date: '', remark: '' }];
    onChange(newEntries);
  };

  const updateEntry = (index, key, newValue) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [key]: newValue };
    onChange(newEntries);
  };

  const removeEntry = (index) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
  };

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('de-DE');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className={`border rounded-lg p-4 space-y-3 ${
        error ? 'border-red-300 bg-red-50' : 'border-gray-300'
      }`}>
        {entries.map((entry, index) => (
          <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded border">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Datum
              </label>
              <input
                type="date"
                value={entry.date || ''}
                onChange={(e) => updateEntry(index, 'date', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {field.entryConfig?.remarkLabel || 'Bemerkung'}
              </label>
              <input
                type="text"
                value={entry.remark || ''}
                onChange={(e) => updateEntry(index, 'remark', e.target.value)}
                placeholder={field.entryConfig?.remarkPlaceholder || 'Zusätzliche Informationen...'}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex flex-col justify-end">
              <button
                onClick={() => removeEntry(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
                title="Eintrag entfernen"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        
        <button
          onClick={addEntry}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          ➕ {field.entryConfig?.addButtonText || 'Datum hinzufügen'}
        </button>
      </div>
      
      {field.description && !error && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Preview of current entries */}
      {entries.length > 0 && (
        <div className="mt-2">
          <div className="text-sm text-gray-600 mb-1">Aktuelle Einträge:</div>
          <div className="space-y-1">
            {entries.map((entry, index) => (
              entry.date ? (
                <div key={index} className="text-sm bg-green-50 text-green-800 p-2 rounded">
                  <strong>📅 {formatDateForDisplay(entry.date)}</strong>
                  {entry.remark && <span> - {entry.remark}</span>}
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main Custom Field Renderer Component
 */
export const CustomFieldRenderer = ({ field, value, onChange, error }) => {
  // Validate field object
  if (!field || !field.type) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600 text-sm">⚠️ Ungültiges Field: {field?.label || 'Unbekannt'}</p>
      </div>
    );
  }

  // Render appropriate component based on field type
  switch (field.type) {
    case 'text':
      return <TextFieldComponent field={field} value={value} onChange={onChange} error={error} />;
    
    case 'textarea':
      return <TextareaFieldComponent field={field} value={value} onChange={onChange} error={error} />;
    
    case 'number':
      return <NumberFieldComponent field={field} value={value} onChange={onChange} error={error} />;
    
    case 'date':
      return <DateFieldComponent field={field} value={value} onChange={onChange} error={error} />;
    
    case 'checkbox':
      return <CheckboxFieldComponent field={field} value={value} onChange={onChange} error={error} />;
    
    case 'select':
      return <SelectFieldComponent field={field} value={value} onChange={onChange} error={error} />;
    
    case 'multiselect':
      return <MultiselectFieldComponent field={field} value={value} onChange={onChange} error={error} />;
    
    case 'multi-entry':
      return <MultiEntryFieldComponent field={field} value={value} onChange={onChange} error={error} />;
    
    case 'multi-entry-date':
      return <MultiEntryDateFieldComponent field={field} value={value} onChange={onChange} error={error} />;
    
    default:
      return (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-600 text-sm">
            ⚠️ Unbekannter Feldtyp: {field.type} für Field "{field.label}"
          </p>
        </div>
      );
  }
};

/**
 * Custom Field Validation
 */
export const validateCustomField = (field, value) => {
  // Required field validation
  if (field.required) {
    if (!value || 
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'boolean' && !value)) {
      return `${field.label} ist ein Pflichtfeld`;
    }
    
    // Special validation for multi-entry fields
    if (field.type === 'multi-entry' && Array.isArray(value)) {
      const hasValidEntry = value.some(entry => entry.selection && entry.selection.trim() !== '');
      if (!hasValidEntry) {
        return `${field.label} benötigt mindestens einen gültigen Eintrag`;
      }
    }

    // Special validation for multi-entry-date fields
    if (field.type === 'multi-entry-date' && Array.isArray(value)) {
      const hasValidEntry = value.some(entry => entry.date && entry.date.trim() !== '');
      if (!hasValidEntry) {
        return `${field.label} benötigt mindestens ein gültiges Datum`;
      }
    }
  }

  // Type-specific validation
  switch (field.type) {
    case 'number':
      if (value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return `${field.label} muss eine gültige Zahl sein`;
        }
        if (field.min !== undefined && numValue < field.min) {
          return `${field.label} muss mindestens ${field.min} sein`;
        }
        if (field.max !== undefined && numValue > field.max) {
          return `${field.label} darf höchstens ${field.max} sein`;
        }
      }
      break;
      
    case 'date':
      if (value && value.trim() !== '') {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return `${field.label} muss ein gültiges Datum sein`;
        }
      }
      break;
      
    case 'multi-entry':
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const entry = value[i];
          if (entry.selection && entry.selection.trim() !== '') {
            // Validate that selection is in baseOptions
            const validOption = field.entryConfig?.baseOptions?.find(
              opt => opt.value === entry.selection
            );
            if (!validOption) {
              return `${field.label}, Eintrag ${i + 1}: Ungültige Auswahl`;
            }
          }
        }
      }
      break;

    case 'multi-entry-date':
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const entry = value[i];
          if (entry.date && entry.date.trim() !== '') {
            const dateValue = new Date(entry.date);
            if (isNaN(dateValue.getTime())) {
              return `${field.label}, Eintrag ${i + 1}: Ungültiges Datum`;
            }
          }
        }
      }
      break;
  }

  return null; // No error
};

export default CustomFieldRenderer;