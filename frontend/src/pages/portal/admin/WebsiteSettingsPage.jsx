import { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  Loader2, 
  ExternalLink,
  Layout,
  Home,
  GraduationCap,
  Users,
  Award,
  FileCheck,
  Building,
  Phone,
  FileText,
  Newspaper,
  Info,
  Footprints,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '@/App';
import ImageUpload from '@/components/admin/ImageUpload';
import ListEditor from '@/components/admin/ListEditor';

const SECTIONS = [
  { id: 'navigation', label: 'Navigation', icon: Layout },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'diploma', label: 'Diploma', icon: GraduationCap },
  { id: 'faculty', label: 'Faculty', icon: Users },
  { id: 'admissions', label: 'Admissions', icon: FileCheck },
  { id: 'about', label: 'About Us', icon: Info },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'blog', label: 'Blog', icon: Newspaper },
  { id: 'academy', label: 'Training Academy', icon: Building },
  { id: 'footer', label: 'Footer', icon: Footprints },
  { id: 'seo', label: 'SEO Settings', icon: Search },
];

// ── OUTSIDE the component so React never re-creates these as new types ──
// Defining components inside another component means every setState call
// produces new function references → React remounts the whole subtree →
// inputs lose focus. This is the fix.
const Field = ({ label, children, description }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-slate-700">{label}</Label>
    {children}
    {description && <p className="text-xs text-slate-500">{description}</p>}
  </div>
);

const SectionHeader = ({ title }) => (
  <div className="border-b border-slate-200 pb-4 mb-6">
    <h3 className="font-heading text-lg font-semibold text-slate-900">
      {title}
    </h3>
  </div>
);

const WebsiteSettingsPage = () => {
  const [activeTab, setActiveTab] = useState('navigation');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsavedTabs, setUnsavedTabs] = useState(new Set());

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchAllSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/website-settings`, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      const settingsData = {};
      Object.keys(response.data.settings || {}).forEach(section => {
        settingsData[section] = response.data.settings[section].content;
      });
      setSettings(settingsData);
    } catch (error) {
      console.error('Fetch settings error:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. Super admin access required.');
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  // Direct field update — no debounce, controlled inputs stay focused
  const updateField = useCallback((section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
    setUnsavedTabs(prev => new Set([...prev, section]));
  }, []);

  const updateSection = useCallback((section, data) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
    setUnsavedTabs(prev => new Set([...prev, section]));
  }, []);

  const saveSection = async (section) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/website-settings/${section}`, {
        content: settings[section] || {}
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setUnsavedTabs(prev => {
        const newSet = new Set(prev);
        newSet.delete(section);
        return newSet;
      });
      toast.success(`${SECTIONS.find(s => s.id === section)?.label} saved successfully`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.status === 401 ? 'Session expired. Please login again.' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  const getSectionData = (section) => settings[section] || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="website-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-slate-900">Website Settings</h1>
          <p className="text-slate-500 mt-1">Manage content for each page</p>
        </div>
        <Button variant="outline" onClick={() => window.open('/', '_blank')}>
          <ExternalLink size={16} className="mr-2" />
          View Website
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-auto p-1 bg-slate-100 rounded-lg">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const hasUnsaved = unsavedTabs.has(section.id);
              return (
                <TabsTrigger key={section.id} value={section.id} className="relative px-3 py-2 text-sm whitespace-nowrap data-[state=active]:bg-white">
                  <Icon size={14} className="mr-1.5" />
                  {section.label}
                  {hasUnsaved && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* TAB 1: Navigation/Header */}
        <TabsContent value="navigation" className="bg-white rounded-xl border p-6">
          <div className="space-y-6">
            <SectionHeader title="Navigation & Header Settings" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <ImageUpload label="Logo" value={getSectionData('navigation').logo_url || ''} onChange={(url) => updateSection('navigation', { logo_url: url })} />
              <Field label="Site Name">
                <Input value={getSectionData('navigation').site_name || ''} onChange={(e) => updateField('navigation', 'site_name', e.target.value)} placeholder="Plan4Growth Academy" />
              </Field>
            </div>

            <Field label="Navigation Links">
              <ListEditor
                items={getSectionData('navigation').nav_links || []}
                onChange={(items) => updateSection('navigation', { nav_links: items })}
                defaultItem={{ label: '', url: '', order: 0 }}
                addLabel="Add Nav Link"
                itemTitle={(item) => item.label || 'New Link'}
                collapsible={false}
                renderItem={(item, index, onChange) => (
                  <div className="grid grid-cols-3 gap-3">
                    <Input defaultValue={item.label || ''} onChange={(e) => onChange({ label: e.target.value })} placeholder="Label" />
                    <Input defaultValue={item.url || ''} onChange={(e) => onChange({ url: e.target.value })} placeholder="URL" />
                    <Input type="number" defaultValue={item.order || 0} onChange={(e) => onChange({ order: parseInt(e.target.value) || 0 })} placeholder="Order" />
                  </div>
                )}
              />
            </Field>

            <div className="grid md:grid-cols-3 gap-6">
              <Field label="Login Button Text">
                <Input value={getSectionData('navigation').login_text || ''} onChange={(e) => updateField('navigation', 'login_text', e.target.value)} placeholder="Login" />
              </Field>
              <Field label="Primary CTA Text">
                <Input value={getSectionData('navigation').cta_text || ''} onChange={(e) => updateField('navigation', 'cta_text', e.target.value)} placeholder="Apply Now" />
              </Field>
              <Field label="Primary CTA URL">
                <Input value={getSectionData('navigation').cta_url || ''} onChange={(e) => updateField('navigation', 'cta_url', e.target.value)} placeholder="/apply" />
              </Field>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Announcement Banner</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Banner Text">
                  <Input value={getSectionData('navigation').banner_text || ''} onChange={(e) => updateField('navigation', 'banner_text', e.target.value)} placeholder="Limited time offer!" />
                </Field>
                <Field label="Banner Link">
                  <Input value={getSectionData('navigation').banner_link || ''} onChange={(e) => updateField('navigation', 'banner_link', e.target.value)} placeholder="/offer" />
                </Field>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Switch checked={getSectionData('navigation').banner_active || false} onCheckedChange={(checked) => updateSection('navigation', { banner_active: checked })} />
                <Label>Banner Active</Label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('navigation')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Navigation
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: Home Page */}
        <TabsContent value="home" className="bg-white rounded-xl border p-6">
          <div className="space-y-8">
            {/* Hero Section */}
            <div>
              <SectionHeader title="Hero Section" />
              <div className="space-y-6">
                <Field label="Badge Text">
                  <Input value={getSectionData('home').hero_badge || ''} onChange={(e) => updateField('home', 'hero_badge', e.target.value)} placeholder="EduQual-Approved Programme" />
                </Field>
                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Main Title Line 1">
                    <Input value={getSectionData('home').hero_title_1 || ''} onChange={(e) => updateField('home', 'hero_title_1', e.target.value)} placeholder="Level 7 Diploma in" />
                  </Field>
                  <Field label="Main Title Line 2 (Highlight)">
                    <Input value={getSectionData('home').hero_title_2 || ''} onChange={(e) => updateField('home', 'hero_title_2', e.target.value)} placeholder="Dental Implantology" />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea value={getSectionData('home').hero_description || ''} onChange={(e) => updateField('home', 'hero_description', e.target.value)} rows={3} placeholder="Develop the clinical confidence..." />
                </Field>
                <Field label="Highlight Tags">
                  <ListEditor
                    items={getSectionData('home').hero_tags || []}
                    onChange={(items) => updateSection('home', { hero_tags: items })}
                    defaultItem={{ text: '' }}
                    addLabel="Add Tag"
                    itemTitle={(item) => item.text || 'New Tag'}
                    collapsible={false}
                    renderItem={(item, index, onChange) => (
                      <Input defaultValue={item.text || ''} onChange={(e) => onChange({ text: e.target.value })} placeholder="Tag text" />
                    )}
                  />
                </Field>
                <div className="grid md:grid-cols-3 gap-6">
                  <Field label="Primary CTA Text">
                    <Input value={getSectionData('home').hero_cta_primary_text || ''} onChange={(e) => updateField('home', 'hero_cta_primary_text', e.target.value)} placeholder="Apply Now" />
                  </Field>
                  <Field label="Secondary CTA Text">
                    <Input value={getSectionData('home').hero_cta_secondary_text || ''} onChange={(e) => updateField('home', 'hero_cta_secondary_text', e.target.value)} placeholder="Book Consultation" />
                  </Field>
                  <Field label="Tertiary CTA Text">
                    <Input value={getSectionData('home').hero_cta_tertiary_text || ''} onChange={(e) => updateField('home', 'hero_cta_tertiary_text', e.target.value)} placeholder="Download Prospectus" />
                  </Field>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <Field label="Primary CTA URL">
                    <Input value={getSectionData('home').hero_cta_primary_url || ''} onChange={(e) => updateField('home', 'hero_cta_primary_url', e.target.value)} placeholder="/apply" />
                  </Field>
                  <Field label="Secondary CTA URL">
                    <Input value={getSectionData('home').hero_cta_secondary_url || ''} onChange={(e) => updateField('home', 'hero_cta_secondary_url', e.target.value)} placeholder="/book" />
                  </Field>
                  <Field label="Tertiary CTA URL">
                    <Input value={getSectionData('home').hero_cta_tertiary_url || ''} onChange={(e) => updateField('home', 'hero_cta_tertiary_url', e.target.value)} placeholder="/prospectus.pdf" />
                  </Field>
                </div>
                <ImageUpload label="Hero Background Image" value={getSectionData('home').hero_image || ''} onChange={(url) => updateSection('home', { hero_image: url })} />
              </div>
            </div>

            {/* About Section */}
            <div className="border-t pt-8">
              <SectionHeader title="About Section" />
              <div className="space-y-6">
                <Field label="Section Title">
                  <Input value={getSectionData('home').about_title || ''} onChange={(e) => updateField('home', 'about_title', e.target.value)} placeholder="About Plan4Growth Academy" />
                </Field>
                <Field label="Description Paragraph 1">
                  <Textarea value={getSectionData('home').about_para_1 || ''} onChange={(e) => updateField('home', 'about_para_1', e.target.value)} rows={3} />
                </Field>
                <Field label="Description Paragraph 2">
                  <Textarea value={getSectionData('home').about_para_2 || ''} onChange={(e) => updateField('home', 'about_para_2', e.target.value)} rows={3} />
                </Field>
                <Field label="Stats">
                  <ListEditor
                    items={getSectionData('home').about_stats || []}
                    onChange={(items) => updateSection('home', { about_stats: items })}
                    defaultItem={{ icon: '', value: '', label: '' }}
                    addLabel="Add Stat"
                    itemTitle={(item) => item.label || 'New Stat'}
                    renderItem={(item, index, onChange) => (
                      <div className="grid grid-cols-3 gap-3">
                        <Input defaultValue={item.icon || ''} onChange={(e) => onChange({ icon: e.target.value })} placeholder="Icon (emoji)" />
                        <Input defaultValue={item.value || ''} onChange={(e) => onChange({ value: e.target.value })} placeholder="Value (e.g. 500+)" />
                        <Input defaultValue={item.label || ''} onChange={(e) => onChange({ label: e.target.value })} placeholder="Label" />
                      </div>
                    )}
                  />
                </Field>
              </div>
            </div>

            {/* Why Implantology Section */}
            <div className="border-t pt-8">
              <SectionHeader title="Why Implantology Section" />
              <div className="space-y-6">
                <Field label="Section Title">
                  <Input value={getSectionData('home').why_title || ''} onChange={(e) => updateField('home', 'why_title', e.target.value)} placeholder="Why Implantology Training Matters" />
                </Field>
                <Field label="Section Description">
                  <Textarea value={getSectionData('home').why_description || ''} onChange={(e) => updateField('home', 'why_description', e.target.value)} rows={3} />
                </Field>
                <Field label="Problem Cards">
                  <ListEditor
                    items={getSectionData('home').why_cards || []}
                    onChange={(items) => updateSection('home', { why_cards: items })}
                    defaultItem={{ title: '', description: '' }}
                    addLabel="Add Card"
                    itemTitle={(item) => item.title || 'New Card'}
                    renderItem={(item, index, onChange) => (
                      <div className="space-y-3">
                        <Input defaultValue={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Title" />
                        <Textarea defaultValue={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" rows={2} />
                      </div>
                    )}
                  />
                </Field>
              </div>
            </div>

            {/* Programme Highlights */}
            <div className="border-t pt-8">
              <SectionHeader title="Programme Highlights Section" />
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Section Title">
                    <Input value={getSectionData('home').highlights_title || ''} onChange={(e) => updateField('home', 'highlights_title', e.target.value)} placeholder="Programme Highlights" />
                  </Field>
                  <Field label="Section Subtitle">
                    <Input value={getSectionData('home').highlights_subtitle || ''} onChange={(e) => updateField('home', 'highlights_subtitle', e.target.value)} />
                  </Field>
                </div>
                <Field label="Highlights List">
                  <ListEditor
                    items={getSectionData('home').highlights_items || []}
                    onChange={(items) => updateSection('home', { highlights_items: items })}
                    defaultItem={{ title: '', description: '', icon: '' }}
                    addLabel="Add Highlight"
                    itemTitle={(item) => item.title || 'New Highlight'}
                    renderItem={(item, index, onChange) => (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input defaultValue={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Title" />
                          <Input defaultValue={item.icon || ''} onChange={(e) => onChange({ icon: e.target.value })} placeholder="Icon" />
                        </div>
                        <Textarea defaultValue={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" rows={2} />
                      </div>
                    )}
                  />
                </Field>
              </div>
            </div>

            {/* Faculty Preview */}
            <div className="border-t pt-8">
              <SectionHeader title="Faculty Preview Section" />
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Section Title">
                    <Input value={getSectionData('home').faculty_title || ''} onChange={(e) => updateField('home', 'faculty_title', e.target.value)} placeholder="Meet Our Faculty" />
                  </Field>
                  <Field label="Section Subtitle">
                    <Input value={getSectionData('home').faculty_subtitle || ''} onChange={(e) => updateField('home', 'faculty_subtitle', e.target.value)} />
                  </Field>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Number of Faculty to Show">
                    <Input type="number" value={getSectionData('home').faculty_count || 3} onChange={(e) => updateField('home', 'faculty_count', parseInt(e.target.value) || 3)} />
                  </Field>
                  <Field label="CTA Button Text">
                    <Input value={getSectionData('home').faculty_cta || ''} onChange={(e) => updateField('home', 'faculty_cta', e.target.value)} placeholder="View All Faculty" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Upcoming Intakes */}
            <div className="border-t pt-8">
              <SectionHeader title="Upcoming Intakes Section" />
              <div className="space-y-6">
                <Field label="Section Title">
                  <Input value={getSectionData('home').intakes_title || ''} onChange={(e) => updateField('home', 'intakes_title', e.target.value)} placeholder="Upcoming Intakes" />
                </Field>
                <Field label="Intake Cards">
                  <ListEditor
                    items={getSectionData('home').intake_cards || []}
                    onChange={(items) => updateSection('home', { intake_cards: items })}
                    defaultItem={{ name: '', date: '', deadline: '', cohort_size: '', is_active: true }}
                    addLabel="Add Intake"
                    itemTitle={(item) => item.name || 'New Intake'}
                    renderItem={(item, index, onChange) => (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input defaultValue={item.name || ''} onChange={(e) => onChange({ name: e.target.value })} placeholder="Intake Name (e.g. June 2026)" />
                          <Input defaultValue={item.cohort_size || ''} onChange={(e) => onChange({ cohort_size: e.target.value })} placeholder="Cohort Size (e.g. 30)" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Start Date</Label>
                            <Input type="date" defaultValue={item.date || ''} onChange={(e) => onChange({ date: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-xs">Deadline Date</Label>
                            <Input type="date" defaultValue={item.deadline || ''} onChange={(e) => onChange({ deadline: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={item.is_active ?? true} onCheckedChange={(checked) => onChange({ is_active: checked })} />
                          <Label className="text-sm">Active</Label>
                        </div>
                      </div>
                    )}
                  />
                </Field>
                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="CTA Button Text">
                    <Input value={getSectionData('home').intakes_cta_text || ''} onChange={(e) => updateField('home', 'intakes_cta_text', e.target.value)} placeholder="Apply Now" />
                  </Field>
                  <Field label="CTA Button URL">
                    <Input value={getSectionData('home').intakes_cta_url || ''} onChange={(e) => updateField('home', 'intakes_cta_url', e.target.value)} placeholder="/apply" />
                  </Field>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('home')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Home Page
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Diploma Programme */}
        <TabsContent value="diploma" className="bg-white rounded-xl border p-6">
          <div className="space-y-8">
            <SectionHeader title="Diploma Programme Page" />
            
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Page Hero Title">
                  <Input value={getSectionData('diploma').hero_title || ''} onChange={(e) => updateField('diploma', 'hero_title', e.target.value)} />
                </Field>
                <Field label="Page Hero Subtitle">
                  <Input value={getSectionData('diploma').hero_subtitle || ''} onChange={(e) => updateField('diploma', 'hero_subtitle', e.target.value)} />
                </Field>
              </div>
              <Field label="Programme Overview">
                <Textarea value={getSectionData('diploma').overview || ''} onChange={(e) => updateField('diploma', 'overview', e.target.value)} rows={4} />
              </Field>
            </div>

            <div className="border-t pt-8">
              <h4 className="font-medium text-slate-900 mb-4">Course Modules</h4>
              <ListEditor
                items={getSectionData('diploma').modules || []}
                onChange={(items) => updateSection('diploma', { modules: items })}
                defaultItem={{ number: '', title: '', description: '', duration: '' }}
                addLabel="Add Module"
                itemTitle={(item) => item.title ? `Module ${item.number}: ${item.title}` : 'New Module'}
                renderItem={(item, index, onChange) => (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <Input defaultValue={item.number || ''} onChange={(e) => onChange({ number: e.target.value })} placeholder="Number" />
                      <Input defaultValue={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Title" className="col-span-2" />
                    </div>
                    <Textarea defaultValue={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" rows={2} />
                    <Input defaultValue={item.duration || ''} onChange={(e) => onChange({ duration: e.target.value })} placeholder="Duration" />
                  </div>
                )}
              />
            </div>

            <div className="border-t pt-8">
              <h4 className="font-medium text-slate-900 mb-4">UK Clinical Training</h4>
              <div className="space-y-6">
                <Field label="Training Title">
                  <Input value={getSectionData('diploma').training_title || ''} onChange={(e) => updateField('diploma', 'training_title', e.target.value)} placeholder="UK Clinical Training" />
                </Field>
                <Field label="Training Description">
                  <Textarea value={getSectionData('diploma').training_description || ''} onChange={(e) => updateField('diploma', 'training_description', e.target.value)} rows={3} />
                </Field>
                <Field label="Training Features">
                  <ListEditor
                    items={getSectionData('diploma').training_features || []}
                    onChange={(items) => updateSection('diploma', { training_features: items })}
                    defaultItem={{ text: '' }}
                    addLabel="Add Feature"
                    itemTitle={(item) => item.text || 'New Feature'}
                    collapsible={false}
                    renderItem={(item, index, onChange) => (
                      <Input defaultValue={item.text || ''} onChange={(e) => onChange({ text: e.target.value })} placeholder="Feature text" />
                    )}
                  />
                </Field>
                <div className="grid md:grid-cols-3 gap-6">
                  <Field label="Location Name">
                    <Input value={getSectionData('diploma').location_name || ''} onChange={(e) => updateField('diploma', 'location_name', e.target.value)} placeholder="Plan4Growth Training Centre" />
                  </Field>
                  <Field label="Location Address">
                    <Input value={getSectionData('diploma').location_address || ''} onChange={(e) => updateField('diploma', 'location_address', e.target.value)} placeholder="Rochester, United Kingdom" />
                  </Field>
                  <Field label="Location Note">
                    <Input value={getSectionData('diploma').location_note || ''} onChange={(e) => updateField('diploma', 'location_note', e.target.value)} placeholder="Accommodation provided" />
                  </Field>
                </div>
              </div>
            </div>

            <div className="border-t pt-8">
              <h4 className="font-medium text-slate-900 mb-4">Programme Fee & Details</h4>
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <Field label="Programme Fee">
                    <Input value={getSectionData('diploma').fee_amount || ''} onChange={(e) => updateField('diploma', 'fee_amount', e.target.value)} placeholder="£7,999" />
                  </Field>
                  <Field label="Programme Duration">
                    <Input value={getSectionData('diploma').duration || ''} onChange={(e) => updateField('diploma', 'duration', e.target.value)} placeholder="12 Months" />
                  </Field>
                  <Field label="Cohort Size">
                    <Input value={getSectionData('diploma').cohort_size || ''} onChange={(e) => updateField('diploma', 'cohort_size', e.target.value)} placeholder="30 dentists" />
                  </Field>
                </div>
                <Field label="Fee Description">
                  <Textarea value={getSectionData('diploma').fee_description || ''} onChange={(e) => updateField('diploma', 'fee_description', e.target.value)} rows={3} />
                </Field>
                <Field label="What's Included">
                  <ListEditor
                    items={getSectionData('diploma').included_items || []}
                    onChange={(items) => updateSection('diploma', { included_items: items })}
                    defaultItem={{ text: '' }}
                    addLabel="Add Item"
                    itemTitle={(item) => item.text || 'New Item'}
                    collapsible={false}
                    renderItem={(item, index, onChange) => (
                      <Input defaultValue={item.text || ''} onChange={(e) => onChange({ text: e.target.value })} placeholder="Included item" />
                    )}
                  />
                </Field>
                <Field label="Accreditation Body">
                  <Input value={getSectionData('diploma').accreditation || ''} onChange={(e) => updateField('diploma', 'accreditation', e.target.value)} placeholder="EduQual UK" />
                </Field>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('diploma')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Diploma Page
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: Faculty */}
        <TabsContent value="faculty" className="bg-white rounded-xl border p-6">
          <div className="space-y-6">
            <SectionHeader title="Faculty Page" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Page Title">
                <Input value={getSectionData('faculty').page_title || ''} onChange={(e) => updateField('faculty', 'page_title', e.target.value)} placeholder="Meet Our Faculty" />
              </Field>
              <Field label="Page Subtitle">
                <Input value={getSectionData('faculty').page_subtitle || ''} onChange={(e) => updateField('faculty', 'page_subtitle', e.target.value)} />
              </Field>
            </div>

            <Field label="Faculty Members">
              <ListEditor
                items={getSectionData('faculty').members || []}
                onChange={(items) => updateSection('faculty', { members: items })}
                defaultItem={{ name: '', title: '', bio: '', specialisation: '', image: '', linkedin: '', order: 0, is_active: true }}
                addLabel="Add Faculty Member"
                itemTitle={(item) => item.name || 'New Member'}
                renderItem={(item, index, onChange) => (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input defaultValue={item.name || ''} onChange={(e) => onChange({ name: e.target.value })} placeholder="Name" />
                      <Input defaultValue={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Title/Role" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input defaultValue={item.specialisation || ''} onChange={(e) => onChange({ specialisation: e.target.value })} placeholder="Specialisation" />
                      <Input defaultValue={item.linkedin || ''} onChange={(e) => onChange({ linkedin: e.target.value })} placeholder="LinkedIn URL" />
                    </div>
                    <Textarea defaultValue={item.bio || ''} onChange={(e) => onChange({ bio: e.target.value })} placeholder="Bio" rows={4} />
                    <ImageUpload label="Profile Image" value={item.image || ''} onChange={(url) => onChange({ image: url })} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Display Order</Label>
                        <Input type="number" defaultValue={item.order || 0} onChange={(e) => onChange({ order: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={item.is_active ?? true} onCheckedChange={(checked) => onChange({ is_active: checked })} />
                        <Label className="text-sm">Active</Label>
                      </div>
                    </div>
                  </div>
                )}
              />
            </Field>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('faculty')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Faculty Page
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: About Us */}
        <TabsContent value="about" className="bg-white rounded-xl border p-6">
          <div className="space-y-6">
            <SectionHeader title="About Us Page" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Page Title">
                <Input value={getSectionData('about').page_title || ''} onChange={(e) => updateField('about', 'page_title', e.target.value)} placeholder="About Plan4Growth Academy" />
              </Field>
              <Field label="Page Subtitle">
                <Input value={getSectionData('about').page_subtitle || ''} onChange={(e) => updateField('about', 'page_subtitle', e.target.value)} placeholder="Our story and mission" />
              </Field>
            </div>

            <ImageUpload label="Hero Image" value={getSectionData('about').hero_image || ''} onChange={(url) => updateSection('about', { hero_image: url })} />

            <Field label="Introduction">
              <Textarea value={getSectionData('about').intro || ''} onChange={(e) => updateField('about', 'intro', e.target.value)} rows={4} placeholder="Brief introduction about the academy..." />
            </Field>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Our Mission</h4>
              <div className="space-y-6">
                <Field label="Mission Title">
                  <Input value={getSectionData('about').mission_title || ''} onChange={(e) => updateField('about', 'mission_title', e.target.value)} placeholder="Our Mission" />
                </Field>
                <Field label="Mission Description">
                  <Textarea value={getSectionData('about').mission_description || ''} onChange={(e) => updateField('about', 'mission_description', e.target.value)} rows={3} />
                </Field>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Our Vision</h4>
              <div className="space-y-6">
                <Field label="Vision Title">
                  <Input value={getSectionData('about').vision_title || ''} onChange={(e) => updateField('about', 'vision_title', e.target.value)} placeholder="Our Vision" />
                </Field>
                <Field label="Vision Description">
                  <Textarea value={getSectionData('about').vision_description || ''} onChange={(e) => updateField('about', 'vision_description', e.target.value)} rows={3} />
                </Field>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Core Values</h4>
              <ListEditor
                items={getSectionData('about').values || []}
                onChange={(items) => updateSection('about', { values: items })}
                defaultItem={{ title: '', description: '', icon: '' }}
                addLabel="Add Value"
                itemTitle={(item) => item.title || 'New Value'}
                renderItem={(item, index, onChange) => (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input defaultValue={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Value Title" />
                      <Input defaultValue={item.icon || ''} onChange={(e) => onChange({ icon: e.target.value })} placeholder="Icon (emoji or icon name)" />
                    </div>
                    <Textarea defaultValue={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" rows={2} />
                  </div>
                )}
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Key Statistics</h4>
              <ListEditor
                items={getSectionData('about').statistics || []}
                onChange={(items) => updateSection('about', { statistics: items })}
                defaultItem={{ value: '', label: '' }}
                addLabel="Add Statistic"
                itemTitle={(item) => item.label || 'New Stat'}
                collapsible={false}
                renderItem={(item, index, onChange) => (
                  <div className="grid grid-cols-2 gap-3">
                    <Input defaultValue={item.value || ''} onChange={(e) => onChange({ value: e.target.value })} placeholder="Value (e.g. 500+)" />
                    <Input defaultValue={item.label || ''} onChange={(e) => onChange({ label: e.target.value })} placeholder="Label" />
                  </div>
                )}
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Team Section</h4>
              <div className="space-y-6">
                <Field label="Team Section Title">
                  <Input value={getSectionData('about').team_title || ''} onChange={(e) => updateField('about', 'team_title', e.target.value)} placeholder="Meet Our Team" />
                </Field>
                <div className="flex items-center gap-3">
                  <Switch checked={getSectionData('about').show_team ?? true} onCheckedChange={(checked) => updateSection('about', { show_team: checked })} />
                  <Label>Show Team Section</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('about')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save About Us Page
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: Admissions */}
        <TabsContent value="admissions" className="bg-white rounded-xl border p-6">
          <div className="space-y-6">
            <SectionHeader title="Admissions Page" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Page Title">
                <Input value={getSectionData('admissions').page_title || ''} onChange={(e) => updateField('admissions', 'page_title', e.target.value)} placeholder="Admissions" />
              </Field>
              <Field label="Page Subtitle">
                <Input value={getSectionData('admissions').page_subtitle || ''} onChange={(e) => updateField('admissions', 'page_subtitle', e.target.value)} />
              </Field>
            </div>

            <Field label="Requirements List">
              <ListEditor
                items={getSectionData('admissions').requirements || []}
                onChange={(items) => updateSection('admissions', { requirements: items })}
                defaultItem={{ text: '' }}
                addLabel="Add Requirement"
                itemTitle={(item) => item.text || 'New Requirement'}
                collapsible={false}
                renderItem={(item, index, onChange) => (
                  <Input defaultValue={item.text || ''} onChange={(e) => onChange({ text: e.target.value })} placeholder="Requirement text" />
                )}
              />
            </Field>

            <Field label="Application Process Steps">
              <ListEditor
                items={getSectionData('admissions').process_steps || []}
                onChange={(items) => updateSection('admissions', { process_steps: items })}
                defaultItem={{ number: '', title: '', description: '' }}
                addLabel="Add Step"
                itemTitle={(item) => item.title ? `Step ${item.number}: ${item.title}` : 'New Step'}
                renderItem={(item, index, onChange) => (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <Input defaultValue={item.number || ''} onChange={(e) => onChange({ number: e.target.value })} placeholder="Number" />
                      <Input defaultValue={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Title" className="col-span-2" />
                    </div>
                    <Textarea defaultValue={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" rows={2} />
                  </div>
                )}
              />
            </Field>

            <Field label="Intake Dates">
              <ListEditor
                items={getSectionData('admissions').intakes || []}
                onChange={(items) => updateSection('admissions', { intakes: items })}
                defaultItem={{ name: '', start_date: '', deadline: '', cohort_size: '', is_active: true }}
                addLabel="Add Intake"
                itemTitle={(item) => item.name || 'New Intake'}
                renderItem={(item, index, onChange) => (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input defaultValue={item.name || ''} onChange={(e) => onChange({ name: e.target.value })} placeholder="Intake Name (e.g. June 2026)" />
                      <Input defaultValue={item.cohort_size || ''} onChange={(e) => onChange({ cohort_size: e.target.value })} placeholder="Cohort Size" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Start Date</Label>
                        <Input type="date" defaultValue={item.start_date || ''} onChange={(e) => onChange({ start_date: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Application Deadline</Label>
                        <Input type="date" defaultValue={item.deadline || ''} onChange={(e) => onChange({ deadline: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={item.is_active ?? true} onCheckedChange={(checked) => onChange({ is_active: checked })} />
                      <Label className="text-sm">Show on Website</Label>
                    </div>
                  </div>
                )}
              />
            </Field>

            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Book Consultation Button Text">
                <Input value={getSectionData('admissions').consult_button || ''} onChange={(e) => updateField('admissions', 'consult_button', e.target.value)} placeholder="Book Consultation" />
              </Field>
              <Field label="Book Consultation URL">
                <Input value={getSectionData('admissions').consult_url || ''} onChange={(e) => updateField('admissions', 'consult_url', e.target.value)} placeholder="https://api.leadconnectorhq.com/..." />
              </Field>
              <Field label="Apply Now Button Text">
                <Input value={getSectionData('admissions').apply_button || ''} onChange={(e) => updateField('admissions', 'apply_button', e.target.value)} placeholder="Apply Now" />
              </Field>
              <Field label="Apply Now URL">
                <Input value={getSectionData('admissions').apply_url || ''} onChange={(e) => updateField('admissions', 'apply_url', e.target.value)} placeholder="/apply" />
              </Field>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('admissions')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Admissions Page
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 8: Blog */}
        <TabsContent value="blog" className="bg-white rounded-xl border p-6">
          <div className="space-y-6">
            <SectionHeader title="Blog Page Settings" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Page Title">
                <Input value={getSectionData('blog').page_title || ''} onChange={(e) => updateField('blog', 'page_title', e.target.value)} placeholder="Blog & News" />
              </Field>
              <Field label="Page Subtitle">
                <Input value={getSectionData('blog').page_subtitle || ''} onChange={(e) => updateField('blog', 'page_subtitle', e.target.value)} placeholder="Latest insights and updates" />
              </Field>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={getSectionData('blog').show_featured ?? true} onCheckedChange={(checked) => updateSection('blog', { show_featured: checked })} />
              <Label>Show Featured Post Section</Label>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Blog Categories</h4>
              <ListEditor
                items={getSectionData('blog').categories || []}
                onChange={(items) => updateSection('blog', { categories: items })}
                defaultItem={{ name: '', slug: '', description: '' }}
                addLabel="Add Category"
                itemTitle={(item) => item.name || 'New Category'}
                collapsible={false}
                renderItem={(item, index, onChange) => (
                  <div className="grid grid-cols-3 gap-3">
                    <Input defaultValue={item.name || ''} onChange={(e) => onChange({ name: e.target.value })} placeholder="Category Name" />
                    <Input defaultValue={item.slug || ''} onChange={(e) => onChange({ slug: e.target.value })} placeholder="slug-url" />
                    <Input defaultValue={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" />
                  </div>
                )}
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Display Settings</h4>
              <div className="grid md:grid-cols-3 gap-6">
                <Field label="Posts Per Page">
                  <Input type="number" value={getSectionData('blog').posts_per_page || 6} onChange={(e) => updateField('blog', 'posts_per_page', parseInt(e.target.value) || 6)} />
                </Field>
                <Field label="Sidebar Title">
                  <Input value={getSectionData('blog').sidebar_title || ''} onChange={(e) => updateField('blog', 'sidebar_title', e.target.value)} placeholder="Recent Posts" />
                </Field>
                <Field label="No Posts Message">
                  <Input value={getSectionData('blog').no_posts_message || ''} onChange={(e) => updateField('blog', 'no_posts_message', e.target.value)} placeholder="No posts yet. Check back soon!" />
                </Field>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">CTA Section</h4>
              <div className="grid md:grid-cols-3 gap-6">
                <Field label="CTA Title">
                  <Input value={getSectionData('blog').cta_title || ''} onChange={(e) => updateField('blog', 'cta_title', e.target.value)} placeholder="Want to learn more?" />
                </Field>
                <Field label="CTA Button Text">
                  <Input value={getSectionData('blog').cta_button || ''} onChange={(e) => updateField('blog', 'cta_button', e.target.value)} placeholder="Contact Us" />
                </Field>
                <Field label="CTA Button URL">
                  <Input value={getSectionData('blog').cta_url || ''} onChange={(e) => updateField('blog', 'cta_url', e.target.value)} placeholder="/contact" />
                </Field>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('blog')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Blog Settings
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 9: Training Academy */}
        <TabsContent value="academy" className="bg-white rounded-xl border p-6">
          <div className="space-y-6">
            <SectionHeader title="Training Academy Page" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Page Title">
                <Input value={getSectionData('academy').page_title || ''} onChange={(e) => updateField('academy', 'page_title', e.target.value)} placeholder="Our Training Academy" />
              </Field>
              <Field label="Page Subtitle">
                <Input value={getSectionData('academy').page_subtitle || ''} onChange={(e) => updateField('academy', 'page_subtitle', e.target.value)} placeholder="State-of-the-art facilities" />
              </Field>
            </div>

            <ImageUpload label="Hero Image" value={getSectionData('academy').hero_image || ''} onChange={(url) => updateSection('academy', { hero_image: url })} />

            <Field label="Academy Introduction">
              <Textarea value={getSectionData('academy').description || ''} onChange={(e) => updateField('academy', 'description', e.target.value)} rows={4} placeholder="Describe your training academy and facilities..." />
            </Field>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Facility Highlights</h4>
              <ListEditor
                items={getSectionData('academy').highlights || []}
                onChange={(items) => updateSection('academy', { highlights: items })}
                defaultItem={{ title: '', description: '', icon: '' }}
                addLabel="Add Highlight"
                itemTitle={(item) => item.title || 'New Highlight'}
                renderItem={(item, index, onChange) => (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input defaultValue={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Feature Title" />
                      <Input defaultValue={item.icon || ''} onChange={(e) => onChange({ icon: e.target.value })} placeholder="Icon (emoji or name)" />
                    </div>
                    <Textarea defaultValue={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" rows={2} />
                  </div>
                )}
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Academy Gallery</h4>
              <p className="text-sm text-slate-500 mb-4">Add images showcasing your training facilities</p>
              <ListEditor
                items={getSectionData('academy').gallery || []}
                onChange={(items) => updateSection('academy', { gallery: items })}
                defaultItem={{ image: '', caption: '', description: '' }}
                addLabel="Add Gallery Image"
                itemTitle={(item) => item.caption || 'Gallery Image'}
                renderItem={(item, index, onChange) => (
                  <div className="space-y-3">
                    <ImageUpload label="Image" value={item.image || ''} onChange={(url) => onChange({ image: url })} />
                    <Input defaultValue={item.caption || ''} onChange={(e) => onChange({ caption: e.target.value })} placeholder="Image Caption/Title" />
                    <Textarea defaultValue={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Image Description (optional)" rows={2} />
                  </div>
                )}
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Training Sections</h4>
              <p className="text-sm text-slate-500 mb-4">Add detailed sections about different training areas</p>
              <ListEditor
                items={getSectionData('academy').sections || []}
                onChange={(items) => updateSection('academy', { sections: items })}
                defaultItem={{ title: '', description: '', image: '', features: [] }}
                addLabel="Add Training Section"
                itemTitle={(item) => item.title || 'New Section'}
                renderItem={(item, index, onChange) => (
                  <div className="space-y-3">
                    <Input defaultValue={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Section Title (e.g., Clinical Training Room)" />
                    <Textarea defaultValue={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Section Description" rows={3} />
                    <ImageUpload label="Section Image" value={item.image || ''} onChange={(url) => onChange({ image: url })} />
                  </div>
                )}
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Location Information</h4>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Location Title">
                    <Input value={getSectionData('academy').location_title || ''} onChange={(e) => updateField('academy', 'location_title', e.target.value)} placeholder="Visit Our Academy" />
                  </Field>
                  <Field label="Address">
                    <Input value={getSectionData('academy').address || ''} onChange={(e) => updateField('academy', 'address', e.target.value)} placeholder="Full address" />
                  </Field>
                </div>
                <Field label="Location Description">
                  <Textarea value={getSectionData('academy').location_description || ''} onChange={(e) => updateField('academy', 'location_description', e.target.value)} rows={2} placeholder="Additional location details..." />
                </Field>
                <Field label="Google Maps Embed URL">
                  <Input value={getSectionData('academy').maps_embed || ''} onChange={(e) => updateField('academy', 'maps_embed', e.target.value)} placeholder="https://www.google.com/maps/embed?..." />
                </Field>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Call to Action</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="CTA Button Text">
                  <Input value={getSectionData('academy').cta_button || ''} onChange={(e) => updateField('academy', 'cta_button', e.target.value)} placeholder="Book a Tour" />
                </Field>
                <Field label="CTA Button URL">
                  <Input value={getSectionData('academy').cta_url || ''} onChange={(e) => updateField('academy', 'cta_url', e.target.value)} placeholder="/contact" />
                </Field>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('academy')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Training Academy
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 8: Contact */}
        <TabsContent value="contact" className="bg-white rounded-xl border p-6">
          <div className="space-y-6">
            <SectionHeader title="Contact Page" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Page Title">
                <Input value={getSectionData('contact').page_title || ''} onChange={(e) => updateField('contact', 'page_title', e.target.value)} placeholder="Contact Us" />
              </Field>
              <Field label="Page Subtitle">
                <Input value={getSectionData('contact').page_subtitle || ''} onChange={(e) => updateField('contact', 'page_subtitle', e.target.value)} />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Phone Number">
                <Input value={getSectionData('contact').phone || ''} onChange={(e) => updateField('contact', 'phone', e.target.value)} placeholder="+44 7352 062709" />
              </Field>
              <Field label="WhatsApp Number">
                <Input value={getSectionData('contact').whatsapp || ''} onChange={(e) => updateField('contact', 'whatsapp', e.target.value)} placeholder="+44 7352 062709" />
              </Field>
              <Field label="Email Address">
                <Input value={getSectionData('contact').email || ''} onChange={(e) => updateField('contact', 'email', e.target.value)} placeholder="info@plan4growth.uk" />
              </Field>
              <Field label="Address">
                <Input value={getSectionData('contact').address || ''} onChange={(e) => updateField('contact', 'address', e.target.value)} placeholder="Rochester, United Kingdom" />
              </Field>
            </div>

            <Field label="Book Now Button URL (GHL)">
              <Input value={getSectionData('contact').booking_url || ''} onChange={(e) => updateField('contact', 'booking_url', e.target.value)} placeholder="https://api.leadconnectorhq.com/widget/bookings/gm-dental-academy-free-strategy-call" />
            </Field>

            <Field label="Google Maps Embed URL">
              <Input value={getSectionData('contact').maps_url || ''} onChange={(e) => updateField('contact', 'maps_url', e.target.value)} />
            </Field>

            <Field label="Office Hours">
              <Textarea value={getSectionData('contact').office_hours || ''} onChange={(e) => updateField('contact', 'office_hours', e.target.value)} rows={3} placeholder="Monday - Friday: 9am - 5pm" />
            </Field>

            <div className="flex items-center gap-3">
              <Switch checked={getSectionData('contact').form_active ?? true} onCheckedChange={(checked) => updateSection('contact', { form_active: checked })} />
              <Label>Contact Form Active</Label>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('contact')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Contact Page
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 10: Footer */}
        <TabsContent value="footer" className="bg-white rounded-xl border p-6">
          <div className="space-y-6">
            <SectionHeader title="Footer Settings" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <ImageUpload label="Footer Logo" value={getSectionData('footer').logo || ''} onChange={(url) => updateSection('footer', { logo: url })} />
              <Field label="Tagline">
                <Textarea value={getSectionData('footer').tagline || ''} onChange={(e) => updateField('footer', 'tagline', e.target.value)} rows={3} />
              </Field>
            </div>

            <Field label="Quick Links">
              <ListEditor
                items={getSectionData('footer').quick_links || []}
                onChange={(items) => updateSection('footer', { quick_links: items })}
                defaultItem={{ label: '', url: '' }}
                addLabel="Add Quick Link"
                itemTitle={(item) => item.label || 'New Link'}
                collapsible={false}
                renderItem={(item, index, onChange) => (
                  <div className="grid grid-cols-2 gap-3">
                    <Input defaultValue={item.label || ''} onChange={(e) => onChange({ label: e.target.value })} placeholder="Label" />
                    <Input defaultValue={item.url || ''} onChange={(e) => onChange({ url: e.target.value })} placeholder="URL" />
                  </div>
                )}
              />
            </Field>

            <Field label="Programme Links">
              <ListEditor
                items={getSectionData('footer').programme_links || []}
                onChange={(items) => updateSection('footer', { programme_links: items })}
                defaultItem={{ label: '', url: '' }}
                addLabel="Add Programme Link"
                itemTitle={(item) => item.label || 'New Link'}
                collapsible={false}
                renderItem={(item, index, onChange) => (
                  <div className="grid grid-cols-2 gap-3">
                    <Input defaultValue={item.label || ''} onChange={(e) => onChange({ label: e.target.value })} placeholder="Label" />
                    <Input defaultValue={item.url || ''} onChange={(e) => onChange({ url: e.target.value })} placeholder="URL" />
                  </div>
                )}
              />
            </Field>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Contact Info</h4>
              <div className="grid md:grid-cols-3 gap-6">
                <Field label="Email">
                  <Input value={getSectionData('footer').contact_email || ''} onChange={(e) => updateField('footer', 'contact_email', e.target.value)} placeholder="info@plan4growth.uk" />
                </Field>
                <Field label="Phone">
                  <Input value={getSectionData('footer').contact_phone || ''} onChange={(e) => updateField('footer', 'contact_phone', e.target.value)} placeholder="+44 7352 062709" />
                </Field>
                <Field label="Address">
                  <Input value={getSectionData('footer').contact_address || ''} onChange={(e) => updateField('footer', 'contact_address', e.target.value)} placeholder="Rochester, UK" />
                </Field>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Social Media Links</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Facebook URL">
                  <Input value={getSectionData('footer').facebook || ''} onChange={(e) => updateField('footer', 'facebook', e.target.value)} />
                </Field>
                <Field label="Instagram URL">
                  <Input value={getSectionData('footer').instagram || ''} onChange={(e) => updateField('footer', 'instagram', e.target.value)} />
                </Field>
                <Field label="LinkedIn URL">
                  <Input value={getSectionData('footer').linkedin || ''} onChange={(e) => updateField('footer', 'linkedin', e.target.value)} />
                </Field>
                <Field label="YouTube URL">
                  <Input value={getSectionData('footer').youtube || ''} onChange={(e) => updateField('footer', 'youtube', e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="grid md:grid-cols-3 gap-6">
                <Field label="Copyright Text">
                  <Input value={getSectionData('footer').copyright || ''} onChange={(e) => updateField('footer', 'copyright', e.target.value)} placeholder="© 2026 Plan4Growth Academy" />
                </Field>
                <Field label="Privacy Policy URL">
                  <Input value={getSectionData('footer').privacy_url || ''} onChange={(e) => updateField('footer', 'privacy_url', e.target.value)} placeholder="/privacy" />
                </Field>
                <Field label="Terms of Service URL">
                  <Input value={getSectionData('footer').terms_url || ''} onChange={(e) => updateField('footer', 'terms_url', e.target.value)} placeholder="/terms" />
                </Field>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('footer')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Footer
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 11: SEO Settings */}
        <TabsContent value="seo" className="bg-white rounded-xl border p-6">
          <div className="space-y-6">
            <SectionHeader title="SEO & Meta Settings" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Site Meta Title" description="Appears in browser tabs and search results">
                <Input value={getSectionData('seo').meta_title || ''} onChange={(e) => updateField('seo', 'meta_title', e.target.value)} placeholder="Plan4Growth Academy | Level 7 Dental Implantology Diploma" />
              </Field>
              <Field label="Keywords" description="Comma-separated keywords for SEO">
                <Input value={getSectionData('seo').keywords || ''} onChange={(e) => updateField('seo', 'keywords', e.target.value)} placeholder="dental implants, implantology course, dental diploma UK" />
              </Field>
            </div>

            <Field label="Site Meta Description" description={`${(getSectionData('seo').meta_description || '').length}/160 characters recommended`}>
              <Textarea value={getSectionData('seo').meta_description || ''} onChange={(e) => updateField('seo', 'meta_description', e.target.value)} rows={3} placeholder="UK-accredited Level 7 Diploma in Dental Implantology. Hands-on clinical training for practising dentists." />
            </Field>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Social Sharing (Open Graph)</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="OG Title" description="Title when shared on social media">
                  <Input value={getSectionData('seo').og_title || ''} onChange={(e) => updateField('seo', 'og_title', e.target.value)} placeholder="Plan4Growth Academy" />
                </Field>
                <Field label="OG Type">
                  <Input value={getSectionData('seo').og_type || ''} onChange={(e) => updateField('seo', 'og_type', e.target.value)} placeholder="website" />
                </Field>
              </div>
              <div className="mt-6">
                <Field label="OG Description">
                  <Textarea value={getSectionData('seo').og_description || ''} onChange={(e) => updateField('seo', 'og_description', e.target.value)} rows={2} placeholder="Description for social media sharing" />
                </Field>
              </div>
              <div className="mt-6">
                <ImageUpload label="OG Image (1200x630 recommended)" value={getSectionData('seo').og_image || ''} onChange={(url) => updateField('seo', 'og_image', url)} />
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Analytics & Tracking</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Google Analytics ID">
                  <Input value={getSectionData('seo').ga_id || ''} onChange={(e) => updateField('seo', 'ga_id', e.target.value)} placeholder="G-XXXXXXXXXX" />
                </Field>
                <Field label="Google Tag Manager ID">
                  <Input value={getSectionData('seo').gtm_id || ''} onChange={(e) => updateField('seo', 'gtm_id', e.target.value)} placeholder="GTM-XXXXXXX" />
                </Field>
                <Field label="Facebook Pixel ID">
                  <Input value={getSectionData('seo').fb_pixel || ''} onChange={(e) => updateField('seo', 'fb_pixel', e.target.value)} placeholder="123456789012345" />
                </Field>
                <Field label="LinkedIn Insight Tag">
                  <Input value={getSectionData('seo').linkedin_tag || ''} onChange={(e) => updateField('seo', 'linkedin_tag', e.target.value)} placeholder="Partner ID" />
                </Field>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Favicon & Branding</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <ImageUpload label="Favicon (32x32 or 64x64)" value={getSectionData('seo').favicon || ''} onChange={(url) => updateField('seo', 'favicon', url)} />
                <ImageUpload label="Apple Touch Icon (180x180)" value={getSectionData('seo').apple_icon || ''} onChange={(url) => updateField('seo', 'apple_icon', url)} />
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-4">Robots & Indexing</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch checked={getSectionData('seo').allow_indexing ?? true} onCheckedChange={(checked) => updateField('seo', 'allow_indexing', checked)} />
                  <Label>Allow search engines to index this site</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={getSectionData('seo').allow_follow ?? true} onCheckedChange={(checked) => updateField('seo', 'allow_follow', checked)} />
                  <Label>Allow search engines to follow links</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => saveSection('seo')} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save SEO Settings
              </Button>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default WebsiteSettingsPage;
