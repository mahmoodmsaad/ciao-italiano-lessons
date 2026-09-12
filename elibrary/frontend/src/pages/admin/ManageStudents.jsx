import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client.js';
import {
  Alert, Badge, ConfirmDialog, EmptyState, Modal, PageLoader, formatDate, formatMoney,
} from '../../components/ui.jsx';

export default function ManageStudents() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users', { params: { search: query, role: 'student' } });
      setUsers(data.users);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (user) => {
    setBusyId(user._id);
    setError('');
    setMessage('');
    try {
      const { data } = await api.put(`/users/${user._id}/status`);
      setMessage(`${user.name}: ${data.message}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    setError('');
    try {
      await api.delete(`/users/${deleting._id}`);
      setMessage(`${deleting.name} delete ho gaya.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-600">
          Registered students, unki active books aur pending fine.
        </p>
      </header>

      <input
        className="input max-w-md"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Naam, email ya roll number se dhoondein..."
      />

      <Alert type="success" onClose={() => setMessage('')}>{message}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <PageLoader />
      ) : users.length === 0 ? (
        <EmptyState icon="🎓" title="Koi student nahi mila" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="table-th">Student</th>
                <th className="table-th">Roll no</th>
                <th className="table-th">Department</th>
                <th className="table-th">Active books</th>
                <th className="table-th">Pending fine</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </td>
                  <td className="table-td">{user.rollNo || '-'}</td>
                  <td className="table-td">{user.department || '-'}</td>
                  <td className="table-td">{user.activeLoans}</td>
                  <td className="table-td">
                    <span className={user.pendingFine > 0 ? 'font-semibold text-red-600' : ''}>
                      {user.pendingFine > 0 ? formatMoney(user.pendingFine) : '-'}
                    </span>
                  </td>
                  <td className="table-td">
                    <Badge tone={user.isActive ? 'green' : 'red'}>
                      {user.isActive ? 'Active' : 'Blocked'}
                    </Badge>
                  </td>
                  <td className="table-td">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => setViewing(user)}
                      >
                        History
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        disabled={busyId === user._id}
                        onClick={() => toggleStatus(user)}
                      >
                        {user.isActive ? 'Block' : 'Unblock'}
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => setDeleting(user)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StudentHistoryModal user={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Student delete karein?"
        message={`${deleting?.name} ka account aur record delete ho jayega.`}
        confirmText="Haan, delete karein"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

/** Ek student ki poori borrowing history. */
function StudentHistoryModal({ user, onClose }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');

    api
      .get(`/users/${user._id}`)
      .then((res) => setIssues(res.data.issues))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <Modal
      open={Boolean(user)}
      title={`${user?.name || ''} - borrowing history`}
      onClose={onClose}
      width="max-w-3xl"
    >
      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <PageLoader label="History load ho rahi hai..." />
      ) : issues.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Is student ne abhi tak koi book issue nahi karwai.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="table-th">Book</th>
                <th className="table-th">Issue</th>
                <th className="table-th">Due</th>
                <th className="table-th">Return</th>
                <th className="table-th">Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.map((issue) => (
                <tr key={issue._id}>
                  <td className="table-td">{issue.book?.title || '(deleted)'}</td>
                  <td className="table-td whitespace-nowrap">{formatDate(issue.issueDate)}</td>
                  <td className="table-td whitespace-nowrap">{formatDate(issue.dueDate)}</td>
                  <td className="table-td whitespace-nowrap">
                    {issue.returnDate ? formatDate(issue.returnDate) : <Badge tone="amber">Pending</Badge>}
                  </td>
                  <td className="table-td">{issue.fine > 0 ? formatMoney(issue.fine) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
