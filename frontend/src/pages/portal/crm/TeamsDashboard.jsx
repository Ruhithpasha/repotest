import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Settings,
  TrendingUp,
  ChevronRight,
  MoreVertical,
  Mail,
  Phone,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API, useAuth } from "@/App";
import axios from "axios";
import { toast } from "sonner";

const TeamsDashboard = () => {
  const [teams, setTeams] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const { user } = useAuth();

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Use my-teams endpoint for managers, all teams for super_admin/admin
      const endpoint = user?.role === 'manager' 
        ? `${API}/teams/my-teams` 
        : `${API}/teams`;
      
      const res = await axios.get(endpoint, { headers });
      setTeams(res.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="teams-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-slate-900">
            Team Management
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage your sales teams and members
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="create-team-btn"
        >
          <UserPlus size={18} className="mr-2" />
          Create Team
        </Button>
      </div>

      {/* Teams Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="font-heading text-lg text-slate-900 mb-2">No Teams Yet</h3>
            <p className="text-slate-500 mb-4">Create your first sales team to get started</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus size={18} className="mr-2" />
              Create Team
            </Button>
          </div>
        ) : (
          teams.map((team) => (
            <div
              key={team.team_id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
              data-testid={`team-${team.team_id}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-heading text-lg text-slate-900">{team.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{team.description || "No description"}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedTeam(team)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit Team</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Manager Info */}
                {team.manager && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Shield className="text-amber-600" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{team.manager.name}</p>
                      <p className="text-xs text-slate-500">Team Manager</p>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="font-heading text-xl text-blue-600">{team.member_count || 0}</p>
                    <p className="text-xs text-blue-600/70">Members</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="font-heading text-xl text-green-600">
                      {team.lead_stats?.paid_in_full || team.lead_stats?.enrolled || 0}
                    </p>
                    <p className="text-xs text-green-600/70">Conversions</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="font-heading text-xl text-purple-600">
                      {team.conversion_rate || 0}%
                    </p>
                    <p className="text-xs text-purple-600/70">Rate</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setSelectedTeam(team)}
                  className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
                >
                  View team details
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTeams();
          }}
        />
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onUpdated={fetchTeams}
        />
      )}
    </div>
  );
};

// Create Team Modal
const CreateTeamModal = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    manager_id: ""
  });
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const token = localStorage.getItem("token");
        // Get users with manager role
        const res = await axios.get(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const managerUsers = res.data.filter(u => 
          u.role === 'manager' || u.role === 'super_admin'
        );
        setManagers(managerUsers);
      } catch (error) {
        console.error("Failed to fetch managers:", error);
      }
    };
    fetchManagers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/teams`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Team created successfully");
      onCreated();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-heading text-xl text-slate-900">Create New Team</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Team Name *</label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sales Team Alpha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 rounded-md border border-slate-200 text-sm resize-none"
              rows={3}
              placeholder="Brief description of this team..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Team Manager *</label>
            <select
              required
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
            >
              <option value="">Select manager</option>
              {managers.map((manager) => (
                <option key={manager.user_id} value={manager.user_id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800" disabled={loading}>
              {loading ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Team Details Modal
const TeamDetailsModal = ({ team, onClose, onUpdated }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/teams/${team.team_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMembers(res.data.members || []);
      } catch (error) {
        console.error("Failed to fetch team details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamDetails();
  }, [team.team_id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-heading text-xl text-slate-900">{team.name}</h2>
          <p className="text-slate-500 text-sm mt-1">{team.description || "No description"}</p>
        </div>

        <div className="p-6">
          <h3 className="font-medium text-slate-900 mb-4">Team Members ({members.length})</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No members in this team yet
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                      <Users className="text-slate-600" size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{member.name}</p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    member.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {member.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamsDashboard;
