import React, { useState, useEffect } from 'react';
import lateEntryService from '../../services/lateEntryService';
import { toast } from 'react-hot-toast';

const AdminLateEntryConfig = () => {
  const [config, setConfig] = useState({
    graceMins: 10,
    penaltyType: 'COUNT',
    rules: [],
    scope: 'COMPANY',
    scopeValue: '',
    resetCycle: 'MONTHLY',
    isActive: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await lateEntryService.getConfig();
      if (res.success && res.data) {
        setConfig(res.data);
      }
    } catch (err) {
      toast.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await lateEntryService.updateConfig(config);
      if (res.success) {
        toast.success('Late entry rules updated successfully');
      }
    } catch (err) {
      toast.error('Failed to save rules');
    }
  };

  const addRule = () => {
    let newRule;
    if (config.penaltyType === 'COUNT') {
      newRule = { threshold: 3, penalty: 'HALF_DAY', value: 0.5 };
    } else if (config.penaltyType === 'TIME') {
      newRule = { minMins: 30, maxMins: 60, penalty: 'HALF_DAY', value: 0.5 };
    } else {
      // PROGRESSIVE
      newRule = { threshold: 1, minMins: 15, penalty: 'WARNING', value: 0 };
    }
    
    setConfig({ ...config, rules: [...config.rules, newRule] });
  };

  const removeRule = (index) => {
    const newRules = config.rules.filter((_, i) => i !== index);
    setConfig({ ...config, rules: newRules });
  };

  const updateRule = (index, field, value) => {
    const newRules = [...config.rules];
    if (['value', 'threshold', 'minMins', 'maxMins'].includes(field)) {
      newRules[index][field] = value === '' ? 0 : parseFloat(value);
    } else {
      newRules[index][field] = value;
    }
    setConfig({ ...config, rules: newRules });
  };

  if (loading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
          <h1 className="text-2xl font-bold text-white">Late Entry Rules</h1>
          <p className="text-blue-100 mt-1">Define how the system handles late check-ins and penalties.</p>
        </div>

        <div className="p-8 space-y-8">
          {/* General Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Grace Period (Minutes)</label>
              <input 
                type="number"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={config.graceMins ?? ''}
                onChange={(e) => setConfig({ ...config, graceMins: e.target.value === '' ? 0 : parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500">Number of minutes allowed after shift start before being marked late.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Penalty Type</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={config.penaltyType}
                onChange={(e) => setConfig({ ...config, penaltyType: e.target.value, rules: [] })}
              >
                <option value="COUNT">Count-based (e.g., 3rd time late)</option>
                <option value="TIME">Time-based (e.g., 30 mins late)</option>
                <option value="PROGRESSIVE">Progressive (Multi-tier hybrid)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Rules Scope</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={config.scope}
                onChange={(e) => setConfig({ ...config, scope: e.target.value, scopeValue: '' })}
              >
                <option value="COMPANY">Company Wide</option>
                <option value="DEPARTMENT">By Portal Type (Dept)</option>
                <option value="ROLE">By User Role</option>
                <option value="STORE">By Store/Hub</option>
              </select>
            </div>

            {['DEPARTMENT', 'ROLE'].includes(config.scope) && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  {config.scope === 'DEPARTMENT' ? 'Select Portal Type' : 'Select User Role'}
                </label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  value={config.scopeValue}
                  onChange={(e) => setConfig({ ...config, scopeValue: e.target.value })}
                >
                  <option value="">Select Value</option>
                  {config.scope === 'DEPARTMENT' ? (
                    <>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="HELPER">Helper</option>
                    </>
                  ) : (
                    <>
                      <option value="SALES_AGENT">Sales Agent</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="TENANT_OWNER">Tenant Owner</option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Reset Cycle</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={config.resetCycle}
                onChange={(e) => setConfig({ ...config, resetCycle: e.target.value })}
              >
                <option value="MONTHLY">Monthly Reset</option>
                <option value="QUARTERLY">Quarterly Reset</option>
                <option value="YEARLY">Yearly Reset</option>
              </select>
            </div>
          </div>

          {/* Rules Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Penalty Rules</h2>
              <button 
                onClick={addRule}
                className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-semibold hover:bg-green-100 transition-colors flex items-center gap-2"
              >
                <span>+</span> Add Rule
              </button>
            </div>

            <div className="space-y-3">
              {config.rules.map((rule, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  {config.penaltyType === 'COUNT' ? (
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm text-gray-600">When late count reach</span>
                      <input 
                        type="number"
                        className="w-16 px-2 py-1 rounded border"
                        value={rule.threshold ?? ''}
                        onChange={(e) => updateRule(index, 'threshold', e.target.value)}
                      />
                    </div>
                  ) : config.penaltyType === 'TIME' ? (
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm text-gray-600">Between</span>
                      <input 
                        type="number"
                        className="w-16 px-2 py-1 rounded border"
                        value={rule.minMins ?? ''}
                        onChange={(e) => updateRule(index, 'minMins', e.target.value)}
                      />
                      <span className="text-sm text-gray-600">and</span>
                      <input 
                        type="number"
                        className="w-16 px-2 py-1 rounded border"
                        value={rule.maxMins ?? ''}
                        onChange={(e) => updateRule(index, 'maxMins', e.target.value)}
                      />
                      <span className="text-sm text-gray-600">mins late</span>
                    </div>
                  ) : (
                    // PROGRESSIVE
                    <div className="flex-1 flex flex-col gap-2">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-gray-400">If Count ≥</span>
                          <input 
                            type="number"
                            className="w-14 px-2 py-1 rounded border text-xs"
                            value={rule.threshold ?? ''}
                            onChange={(e) => updateRule(index, 'threshold', e.target.value)}
                          />
                          <span className="text-[10px] uppercase font-bold text-gray-400">OR Mins ≥</span>
                          <input 
                            type="number"
                            className="w-14 px-2 py-1 rounded border text-xs"
                            value={rule.minMins ?? ''}
                            onChange={(e) => updateRule(index, 'minMins', e.target.value)}
                          />
                       </div>
                    </div>
                  )}

                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-gray-600">Apply</span>
                    <select 
                      className="px-2 py-1 rounded border text-sm"
                      value={rule.penalty}
                      onChange={(e) => updateRule(index, 'penalty', e.target.value)}
                    >
                      <option value="WARNING">Warning</option>
                      <option value="HALF_DAY">Half Day Leave</option>
                      <option value="FULL_DAY">Full Day Leave</option>
                      <option value="LOP">Loss of Pay (LOP)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Val:</span>
                    <input 
                      type="number"
                      step="0.5"
                      className="w-16 px-2 py-1 rounded border"
                      value={rule.value ?? ''}
                      onChange={(e) => updateRule(index, 'value', e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={() => removeRule(index)}
                    className="text-red-400 hover:text-red-600 p-2"
                  >
                    🗑️
                  </button>
                </div>
              ))}

              {config.rules.length === 0 && (
                <div className="text-center py-8 text-gray-400 italic">
                  No rules defined. Add a rule to start penalizing late entries.
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button 
              onClick={handleSave}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              Save Late Entry Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLateEntryConfig;
