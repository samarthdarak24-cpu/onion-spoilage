import React, { useState, useEffect } from 'react';
import { Search, Plus, X, User, Phone, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { Spinner } from './ui';

interface Farmer {
  id: string;
  fullName: string;
  farmerId: string;
  mobile: string;
  village: string;
  farmName?: string;
  fpoId?: string;
  fpoName?: string;
}

interface FarmerSelectorProps {
  value: string;
  onChange: (farmerId: string, farmer: Farmer) => void;
  fpos?: any[];
}

export function FarmerSelector({ value, onChange, fpos = [] }: FarmerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Farmer[]>([]);
  const [allFarmers, setAllFarmers] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    mobile: '',
    village: '',
    farmName: '',
    fpoId: '',
  });
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Load all farmers on mount
  useEffect(() => {
    api.getFarmers().then((farmers) => {
      const enriched = farmers.map((f) => ({
        ...f,
        fpoName: fpos.find((fpo) => fpo.id === f.fpoId)?.name,
      }));
      setAllFarmers(enriched);
      
      // Set selected farmer if value is provided
      if (value) {
        const found = enriched.find((f) => f.id === value);
        if (found) setSelectedFarmer(found);
      }
    });
  }, [value, fpos]);

  // Search farmers
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(allFarmers.slice(0, 10));
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      api.searchFarmers(searchQuery)
        .then((results) => {
          const enriched = results.map((f) => ({
            ...f,
            fpoName: fpos.find((fpo) => fpo.id === f.fpoId)?.name,
          }));
          setSearchResults(enriched);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, allFarmers, fpos]);

  const handleSelect = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    onChange(farmer.id, farmer);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegisterError('');

    try {
      const newFarmer = await api.registerFarmer({
        fullName: registerForm.fullName,
        mobile: registerForm.mobile,
        village: registerForm.village,
        farmName: registerForm.farmName || undefined,
        fpoId: registerForm.fpoId || undefined,
      });

      const enrichedFarmer = {
        ...newFarmer,
        fpoName: fpos.find((fpo) => fpo.id === newFarmer.fpoId)?.name,
      };

      // Add to local list
      setAllFarmers([enrichedFarmer, ...allFarmers]);
      
      // Select the new farmer
      handleSelect(enrichedFarmer);
      
      // Close modal and reset form
      setShowRegisterModal(false);
      setRegisterForm({ fullName: '', mobile: '', village: '', farmName: '', fpoId: '' });
    } catch (err: any) {
      setRegisterError(err.message || 'Failed to register farmer');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="relative">
      {/* Selected Farmer Display */}
      {selectedFarmer && !showDropdown ? (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <User size={18} className="text-forest" />
                <span className="font-bold text-ink">{selectedFarmer.fullName}</span>
              </div>
              <div className="mt-2 grid gap-1.5 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-semibold text-forest">{selectedFarmer.farmerId}</span>
                  <span>•</span>
                  <span>{selectedFarmer.village}</span>
                </div>
                {selectedFarmer.mobile && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} />
                    <span>{selectedFarmer.mobile}</span>
                  </div>
                )}
                {selectedFarmer.farmName && (
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} />
                    <span>{selectedFarmer.farmName}</span>
                  </div>
                )}
                {selectedFarmer.fpoName && (
                  <div className="text-xs text-forest">FPO: {selectedFarmer.fpoName}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowDropdown(true)}
              className="text-xs font-semibold text-forest hover:text-darkgreen"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Search Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search farmer by name, mobile, or Farmer ID..."
              className="input w-full pl-10 pr-24"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            <button
              onClick={() => setShowRegisterModal(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-darkgreen"
            >
              <Plus size={14} />
              New
            </button>
          </div>

          {/* Dropdown Results */}
          {showDropdown && (
            <div className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg">
              {isSearching ? (
                <div className="p-4 text-center">
                  <Spinner label="Searching..." />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted">
                  No farmers found. <button onClick={() => setShowRegisterModal(true)} className="font-semibold text-forest">Register new farmer</button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {searchResults.map((farmer) => (
                    <button
                      key={farmer.id}
                      onClick={() => handleSelect(farmer)}
                      className="w-full p-3 text-left hover:bg-mint/30 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-ink">{farmer.fullName}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                            <span className="font-mono font-semibold text-forest">{farmer.farmerId}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin size={11} />
                              {farmer.village}
                            </span>
                          </div>
                          {farmer.fpoName && (
                            <div className="mt-1 text-xs text-forest">FPO: {farmer.fpoName}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">Register New Farmer</h3>
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  setRegisterError('');
                }}
                className="text-muted hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ramesh Patil"
                  className="input mt-1 w-full"
                  value={registerForm.fullName}
                  onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91-9876543210"
                  className="input mt-1 w-full"
                  value={registerForm.mobile}
                  onChange={(e) => setRegisterForm({ ...registerForm, mobile: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Village *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Nashik"
                  className="input mt-1 w-full"
                  value={registerForm.village}
                  onChange={(e) => setRegisterForm({ ...registerForm, village: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Farm Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Ram Agro Farms"
                  className="input mt-1 w-full"
                  value={registerForm.farmName}
                  onChange={(e) => setRegisterForm({ ...registerForm, farmName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">FPO (optional)</label>
                <select
                  className="input mt-1 w-full"
                  value={registerForm.fpoId}
                  onChange={(e) => setRegisterForm({ ...registerForm, fpoId: e.target.value })}
                >
                  <option value="">None</option>
                  {fpos.map((fpo) => (
                    <option key={fpo.id} value={fpo.id}>{fpo.name}</option>
                  ))}
                </select>
              </div>

              {registerError && (
                <div className="rounded-lg bg-reject/10 px-3 py-2 text-xs text-reject">
                  {registerError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setRegisterError('');
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="btn-primary flex-1"
                >
                  {registering ? <Spinner label="Registering..." /> : <>Create Farmer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
