import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Building, MapPin, Users, X } from 'lucide-react';
import { AppState, Property } from '../types';
import { formatINR, generateUid } from '../utils/formatters';

interface PropertiesViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const PropertiesView: React.FC<PropertiesViewProps> = ({
  state,
  onUpdateState,
  onShowToast,
}) => {
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Residential Flat');
  const [address, setAddress] = useState('');

  const openAddModal = () => {
    setEditingProp(null);
    setName('');
    setType('Residential Flat');
    setAddress('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Property) => {
    setEditingProp(p);
    setName(p.name);
    setType(p.type);
    setAddress(p.address);
    setIsModalOpen(true);
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('Please provide a property title.');
      return;
    }

    if (editingProp) {
      const updated = state.properties.map((p) =>
        p.id === editingProp.id
          ? { ...p, name: name.trim(), type: type.trim(), address: address.trim() }
          : p
      );
      onUpdateState({ ...state, properties: updated });
      onShowToast(`Updated property ${name.trim()}`);
    } else {
      const newProp: Property = {
        id: generateUid(),
        name: name.trim(),
        type: type.trim(),
        address: address.trim(),
      };
      onUpdateState({ ...state, properties: [...state.properties, newProp] });
      onShowToast(`Added property ${name.trim()}`);
    }

    setIsModalOpen(false);
  };

  const handleDeleteProperty = (id: string, propName: string) => {
    const hasTenants = state.tenants.some((t) => t.propertyId === id);
    if (hasTenants) {
      if (!window.confirm(`This property has active tenants assigned. Are you sure you want to delete "${propName}"?`)) {
        return;
      }
    } else if (!window.confirm(`Delete property "${propName}"?`)) {
      return;
    }

    onUpdateState({
      ...state,
      properties: state.properties.filter((p) => p.id !== id),
      tenants: state.tenants.map((t) => (t.propertyId === id ? { ...t, propertyId: '' } : t)),
    });
    onShowToast(`Property "${propName}" removed`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Real Estate &amp; Rental Units
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage owned residential and commercial assets, addresses, and monthly revenue rolls
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {state.properties.map((property) => {
          const tenantsInProp = state.tenants.filter((t) => t.propertyId === property.id);
          const totalMonthlyRent = tenantsInProp.reduce((sum, t) => sum + t.monthlyRent, 0);

          return (
            <div
              key={property.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {property.name}
                      </h3>
                      <div className="text-xs font-medium text-teal-700 dark:text-teal-400">
                        {property.type}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(property)}
                      aria-label="Edit property"
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(property.id, property.name)}
                      aria-label="Delete property"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{property.address || 'No address provided'}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {tenantsInProp.length} Tenant{tenantsInProp.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="font-mono tabular-nums text-right">
                  <div className="text-[10px] text-slate-400 uppercase">Monthly Roll</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(totalMonthlyRent)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Property Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingProp ? 'Edit Property' : 'Add Property'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Property Name / Unit # *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Green Acres"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Property Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="Residential 2BHK Flat">Residential 2BHK Flat</option>
                  <option value="Residential 3BHK Flat">Residential 3BHK Flat</option>
                  <option value="Commercial Retail Shop">Commercial Retail Shop</option>
                  <option value="Independent Luxury Villa">Independent Luxury Villa</option>
                  <option value="Commercial Office Space">Commercial Office Space</option>
                  <option value="Residential Studio Apartment">Residential Studio Apartment</option>
                  <option value="Warehouse / Storage">Warehouse / Storage</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Address (Appears on Receipts &amp; Reminders)
                </label>
                <textarea
                  rows={3}
                  placeholder="Street address, locality, city, pin code..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                >
                  {editingProp ? 'Update Property' : 'Save Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
