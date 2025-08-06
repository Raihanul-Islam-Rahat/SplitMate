/* SplitMate – Ultra-Mobile Responsive (single file) */
import React, { useState, useEffect, useMemo } from 'react';

/* ----------  HELPERS  ---------- */
const uid = () => Math.random().toString(36).substr(2, 9);
const fmt = (n) => (+n).toFixed(2);

/* ----------  THEME  ---------- */
const CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#ff4757' },
  { name: 'Transport', icon: '🚗', color: '#3742fa' },
  { name: 'Accommodation', icon: '🏨', color: '#2ed573' },
  { name: 'Activities', icon: '🎉', color: '#a55eea' },
  { name: 'Shopping', icon: '🛍️', color: '#ffa502' },
  { name: 'Other', icon: '💡', color: '#dfe4ea' },
];

const COLORS = {
  bg: 'linear-gradient(135deg,#0f0f23,#1e1e38)',
  glass: 'rgba(255,255,255,.06)',
  glassBorder: 'rgba(255,255,255,.15)',
  accent: '#00f5ff',
  danger: '#e84393',
  remaining: '#f58220',
  text: '#f7f7ff',
  muted: '#aaa',
};

/* ----------  PDF PRINT HELPER  ---------- */
const openPrintSummary = (group, balances, totalGroupSpendingForBudget) => {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  const doc = w.document;
  doc.write(`<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>SplitMate – ${group.name} Summary</title>
    <style>
      body{font-family:Inter,system-ui;background:#f7f7ff;color:#0f0f23;margin:0;padding:clamp(1rem,5vw,2rem);line-height:1.6}
      h1,h2{color:#00f5ff;text-shadow:0 0 6px rgba(0,245,255,.7)}
      table{width:100%;border-collapse:collapse;margin:1rem 0}
      th,td{padding:0.75rem;border-bottom:1px solid #ddd;text-align:left;font-size:clamp(0.875rem,2.5vw,1rem)}
      th{background:rgba(0,245,255,.1)}
      .glass{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:clamp(0.75rem,3vw,1rem);margin-bottom:1rem}
      .icon{font-size:clamp(1rem,3vw,1.2rem);margin-right:0.25rem}
      .right{text-align:right}
    </style>
  </head>
  <body>
    <h1>SplitMate – ${group.name}</h1>
    <div class="glass">
      <h2>Final Settlement</h2>
      <table>
        <thead>
          <tr><th>Member</th><th class="right">Amount</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${group.members
            .map(
              (m) =>
                `<tr><td>${m.name}</td><td class="right">$${fmt(
                  balances[m.id] || 0
                )}</td><td>${
                  (balances[m.id] || 0) > 0 ? 'collects' : 'pays'
                }</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="glass">
      <h2>Expense Summary</h2>
      <p><strong>Group Expenses:</strong> $${fmt(
        totalGroupSpendingForBudget
      )}</p>
      <p><strong>Personal Expenses:</strong> $${fmt(
        group.expenses
          .filter((e) => e.isPersonal)
          .reduce((s, e) => s + e.amount, 0)
      )}</p>
      <table>
        <thead>
          <tr><th>Category</th><th class="right">Amount</th></tr>
        </thead>
        <tbody>
          ${CATEGORIES.map((c) => {
            const amt = group.expenses
              .filter((e) => e.category === c.name && !e.isPersonal)
              .reduce((s, e) => s + e.amount, 0);
            return amt
              ? `<tr><td><span class="icon">${c.icon}</span>${
                  c.name
                }</td><td class="right">$${fmt(amt)}</td></tr>`
              : '';
          }).join('')}
        </tbody>
      </table>
    </div>
  </body>
  </html>`);
  doc.close();
  w.print();
};

/* ----------  MAIN COMPONENT  ---------- */
export default function App() {
  /* ----------------  STATE  ---------------- */
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(null);

  /* form */
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState(CATEGORIES[0].name);
  const [personal, setPersonal] = useState(false);
  const [paidByGroupBudget, setPaidByGroupBudget] = useState(false);
  const [payers, setPayers] = useState([]);
  const [participantIds, setParticipantIds] = useState([]);

  /* modals */
  const [showCreate, setShowCreate] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName] = useState('');
  const [showConfirmRemoveMember, setShowConfirmRemoveMember] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [myId] = useState(uid());

  /* derived */
  const activeGroups = useMemo(
    () => groups.filter((g) => !g.deleted),
    [groups]
  );
  const archivedGroups = useMemo(
    () => groups.filter((g) => g.deleted),
    [groups]
  );
  const currentGroup = useMemo(
    () => groups.find((g) => g.id === currentGroupId),
    [groups, currentGroupId]
  );

  const balances = useMemo(() => {
    if (!currentGroup) return {};
    const bal = {};
    currentGroup.members.forEach((m) => (bal[m.id] = 0));
    currentGroup.expenses.forEach((ex) => {
      if (ex.isPersonal) return;
      ex.payers.forEach((p) => (bal[p.id] = (bal[p.id] || 0) + p.amount));
      const share = ex.amount / ex.participantIds.length;
      ex.participantIds.forEach((id) => (bal[id] -= share));
    });
    return bal;
  }, [currentGroup]);

  const totalGroupSpendingForBudget = useMemo(() => {
    if (!currentGroup) return 0;
    return currentGroup.expenses
      .filter((e) => e.paidByGroupEqually && !e.isPersonal)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [currentGroup]);

  const remainingBudget = useMemo(
    () => (currentGroup?.budget || 0) - totalGroupSpendingForBudget,
    [currentGroup, totalGroupSpendingForBudget]
  );

  const yourTotalPaid = useMemo(() => {
    if (!currentGroup) return 0;
    return currentGroup.expenses.reduce(
      (sum, ex) =>
        sum +
        ex.payers
          .filter((p) => p.id === myId)
          .reduce((s, p) => s + p.amount, 0),
      0
    );
  }, [currentGroup, myId]);

  /* ----------  HANDLERS  ---------- */
  const createGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: uid(),
      name: newGroupName.trim(),
      budget: 0,
      deleted: false,
      members: [{ id: myId, name: 'You' }],
      expenses: [],
    };
    setGroups([...groups, newGroup]);
    setCurrentGroupId(newGroup.id);
    setNewGroupName('');
    setShowCreate(false);
  };

  const addMember = (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const newMember = { id: uid(), name: newMemberName.trim() };
    setGroups((prev) =>
      prev.map((g) =>
        g.id === currentGroupId
          ? { ...g, members: [...g.members, newMember] }
          : g
      )
    );
    setNewMemberName('');
    setShowAddMember(false);
  };

  const removeMember = (memberId) => {
    if (currentGroup?.members.length === 1) {
      alert('A group must have at least one member');
      return;
    }
    setShowConfirmRemoveMember(memberId);
  };

  const confirmRemoveMember = () => {
    if (currentGroup?.members.length === 1) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === currentGroupId
          ? {
              ...g,
              members: g.members.filter(
                (m) => m.id !== showConfirmRemoveMember
              ),
              expenses: g.expenses.map((ex) => ({
                ...ex,
                payers: ex.payers.filter(
                  (p) => p.id !== showConfirmRemoveMember
                ),
                participantIds: ex.participantIds.filter(
                  (id) => id !== showConfirmRemoveMember
                ),
              })),
            }
          : g
      )
    );
    setShowConfirmRemoveMember(null);
  };

  const toggleCompleted = () =>
    setGroups((prev) =>
      prev.map((g) =>
        g.id === currentGroupId ? { ...g, completed: !g.completed } : g
      )
    );

  const saveBudget = (val) => {
    const budget = val === '' ? 0 : parseFloat(val);
    setGroups((prev) =>
      prev.map((g) =>
        g.id === currentGroupId
          ? { ...g, budget: isNaN(budget) || budget < 0 ? 0 : budget }
          : g
      )
    );
  };

  const addExpense = (e) => {
    e.preventDefault();
    const description = desc.trim();
    if (!description) return alert('Description is required');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0)
      return alert('Please enter a valid positive amount');
    if (participantIds.length < 1)
      return alert('At least one participant is required');

    let payersToSave = [];
    let participantsToSave = [...participantIds];

    if (personal) {
      payersToSave = [{ id: myId, amount: amt }];
      participantsToSave = [myId];
    } else if (paidByGroupBudget) {
      const amountPerMember = amt / currentGroup.members.length;
      payersToSave = currentGroup.members.map((m) => ({
        id: m.id,
        amount: amountPerMember,
      }));
    } else {
      const total = payers.reduce((t, p) => t + parseFloat(p.amount || 0), 0);
      if (Math.abs(total - amt) > 0.01)
        return alert('Sum of payer amounts must equal expense amount');
      payersToSave = payers.map((p) => ({
        id: p.id,
        amount: parseFloat(p.amount),
      }));
    }

    const newExpense = {
      id: uid(),
      description,
      amount: amt,
      category: cat,
      isPersonal: personal,
      paidByGroupEqually: paidByGroupBudget,
      payers: payersToSave,
      participantIds: participantsToSave,
      timestamp: Date.now(),
    };
    setGroups((prev) =>
      prev.map((g) =>
        g.id === currentGroupId
          ? { ...g, expenses: [newExpense, ...g.expenses] }
          : g
      )
    );
    setDesc('');
    setAmount('');
    setPersonal(false);
    setPaidByGroupBudget(false);
    setPayers([]);
    setParticipantIds([]);
  };

  const deleteExpense = (exId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === currentGroupId
            ? { ...g, expenses: g.expenses.filter((ex) => ex.id !== exId) }
            : g
        )
      );
    }
  };

  const archiveGroup = () => {
    if (window.confirm('Are you sure you want to archive this group?')) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === currentGroupId
            ? { ...g, deleted: true, deletedAt: Date.now() }
            : g
        )
      );
      setCurrentGroupId(null);
    }
  };

  const restoreGroup = (gId) => {
    if (window.confirm('Are you sure you want to restore this group?')) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === gId ? { ...g, deleted: false, deletedAt: null } : g
        )
      );
    }
  };

  const deleteGroup = () => {
    if (window.confirm('Permanently delete this group?')) {
      setGroups((prev) => prev.filter((g) => g.id !== currentGroupId));
      setCurrentGroupId(null);
      setShowCreate(true);
    }
  };

  const deleteArchivedGroup = (gId) => {
    if (window.confirm('Permanently delete this archived group?')) {
      setGroups((prev) => prev.filter((g) => g.id !== gId));
      setShowConfirmDelete(false);
    }
  };

  const startEditName = (m) => {
    setEditingName(m.id);
    setTempName(m.name);
  };

  const saveName = (id) => {
    if (!tempName.trim()) {
      alert('Name cannot be empty');
      return;
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.id === currentGroupId
          ? {
              ...g,
              members: g.members.map((m) =>
                m.id === id ? { ...m, name: tempName.trim() } : m
              ),
            }
          : g
      )
    );
    setEditingName(null);
  };

  /* ----------  RENDER  ---------- */
  if (!currentGroup) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: COLORS.bg,
          color: COLORS.text,
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(1rem, 5vw, 2rem)',
          boxSizing: 'border-box',
        }}
      >
        <Container>
          <GlassCard>
            <h1
              style={{
                fontSize: 'clamp(1.5rem, 6vw, 2.5rem)',
                color: COLORS.accent,
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              SplitMate
            </h1>
            {activeGroups.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem 0',
                  color: '#aaa',
                }}
              >
                <svg
                  width="clamp(80px, 20vw, 120px)"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="32"
                    cy="20"
                    r="12"
                    fill="#00f5ff"
                    fillOpacity=".3"
                  />
                  <circle
                    cx="20"
                    cy="40"
                    r="10"
                    fill="#e84393"
                    fillOpacity=".3"
                  />
                  <circle
                    cx="44"
                    cy="40"
                    r="10"
                    fill="#f58220"
                    fillOpacity=".3"
                  />
                  <path
                    d="M32 32c-4 4-8 8-12 8s-8-4-8-8 4-8 8-8h24c4 0 8 4 8 8s-4 8-8 8-8-4-12-8z"
                    fill="currentColor"
                    fillOpacity=".1"
                  />
                </svg>
                <p style={{ marginTop: '1rem' }}>
                  No groups yet. Create one to start!
                </p>
              </div>
            )}
            <Flex col gap="1rem" style={{ width: '100%' }}>
              {activeGroups.map((g) => (
                <Button key={g.id} onClick={() => setCurrentGroupId(g.id)}>
                  {g.name}
                </Button>
              ))}
              <Button onClick={() => setShowCreate(true)}>
                Create New Group
              </Button>
              {archivedGroups.length > 0 && (
                <>
                  <h3
                    style={{
                      fontSize: '1rem',
                      marginTop: '1rem',
                      color: COLORS.accent,
                    }}
                  >
                    Archived
                  </h3>
                  {archivedGroups.map((g) => (
                    <Flex key={g.id} between>
                      <span style={{ opacity: 0.6 }}>{g.name}</span>
                      <Flex gap="0.5rem">
                        <Button small onClick={() => restoreGroup(g.id)}>
                          Restore
                        </Button>
                        <Button
                          small
                          danger
                          onClick={() => {
                            setCurrentGroupId(g.id);
                            setShowConfirmDelete(true);
                          }}
                        >
                          Delete
                        </Button>
                      </Flex>
                    </Flex>
                  ))}
                </>
              )}
            </Flex>
          </GlassCard>

          {showCreate && (
            <Modal onClose={() => setShowCreate(false)}>
              <h2 style={{ marginBottom: '1rem' }}>Create Group</h2>
              <form onSubmit={createGroup}>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  autoFocus
                />
                <Flex gap="0.5rem" style={{ marginTop: '1rem' }}>
                  <Button type="submit">Create</Button>
                  <Button danger onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </Flex>
              </form>
            </Modal>
          )}

          {showConfirmDelete && (
            <Modal onClose={() => setShowConfirmDelete(false)}>
              <h2 style={{ marginBottom: '1rem', color: COLORS.danger }}>
                Delete Group
              </h2>
              <p style={{ color: '#aaa', marginBottom: '1rem' }}>
                Permanently delete this archived group?
              </p>
              <Flex gap="0.5rem">
                <Button
                  danger
                  onClick={() => deleteArchivedGroup(currentGroupId)}
                >
                  Delete
                </Button>
                <Button onClick={() => setShowConfirmDelete(false)}>
                  Cancel
                </Button>
              </Flex>
            </Modal>
          )}
        </Container>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: 'Inter, sans-serif',
        padding: 'clamp(0.75rem, 4vw, 1.5rem)',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <Container>
        <GlassCard>
          <Flex between style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
                  color: COLORS.accent,
                  cursor: 'pointer',
                }}
                onClick={() => setCurrentGroupId(null)}
              >
                Groups &gt; {currentGroup.name}
              </div>
              <h1
                style={{
                  fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
                  color: COLORS.accent,
                  marginBottom: '0.25rem',
                }}
              >
                {currentGroup.name}
              </h1>
              <p
                style={{
                  color: '#aaa',
                  fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
                }}
              >
                {currentGroup.expenses.length} expense
                {currentGroup.expenses.length !== 1 ? 's' : ''}
                {currentGroup.completed && ' • Completed'}
              </p>
            </div>

            <Flex gap="0.5rem" style={{ flexWrap: 'wrap' }}>
              <Button
                onClick={() => setShowMembersDrawer(true)}
                style={{
                  background: COLORS.accent,
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                Members
              </Button>
              <Button
                onClick={toggleCompleted}
                style={{
                  background: COLORS.accent,
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                {currentGroup.completed ? 'Re-open' : 'Mark Completed'}
              </Button>
              <Button
                onClick={() => setShowDrawer(true)}
                style={{
                  background: COLORS.accent,
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                Dashboard
              </Button>
            </Flex>
          </Flex>
        </GlassCard>

        <GlassCard>
          <h3 style={{ marginBottom: '1rem', color: COLORS.accent }}>
            Group Budget
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(1rem, 4vw, 2rem)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '100%',
                }}
              >
                <Input
                  type="number"
                  placeholder="0"
                  value={currentGroup.budget}
                  onChange={(e) => saveBudget(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding:
                      'clamp(0.75rem, 3vw, 1.5rem) clamp(1.5rem, 4vw, 2.5rem) clamp(0.75rem, 3vw, 1.5rem) clamp(2.5rem, 6vw, 3.5rem)',
                    color: COLORS.text,
                    fontSize: 'clamp(1.25rem, 5vw, 2rem)',
                    fontWeight: 700,
                    textAlign: 'center',
                    boxShadow: '0 0 16px rgba(0,245,255,0.6)',
                    width: '100%',
                    textShadow: '0 0 8px rgba(0,245,255,0.5)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 'clamp(0.75rem, 2vw, 1rem)',
                    transform: 'translateY(-50%)',
                    fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                    fontWeight: 700,
                    color: COLORS.accent,
                    textShadow: '0 0 6px rgba(0,245,255,0.7)',
                  }}
                >
                  $
                </span>
              </div>
              <div
                style={{
                  fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
                  marginTop: 6,
                  color: '#aaa',
                  textAlign: 'center',
                }}
              >
                Total Budget
              </div>
            </div>
            <div
              style={{
                width: 2,
                height: 'clamp(30px, 8vw, 60px)',
                background:
                  'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent)',
              }}
            />
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'clamp(1.25rem, 5vw, 2rem)',
                  fontWeight: 700,
                  textAlign: 'center',
                  color: remainingBudget >= 0 ? COLORS.remaining : '#ff2e63',
                }}
              >
                ${fmt(remainingBudget)}
              </div>
              <div
                style={{
                  fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
                  marginTop: 6,
                  color: '#aaa',
                  textAlign: 'center',
                }}
              >
                Remaining
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1rem',
              position: 'relative',
              height: 8,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${Math.min(
                  100,
                  (totalGroupSpendingForBudget /
                    Math.max(currentGroup.budget, 1)) *
                    100
                )}%`,
                background:
                  remainingBudget >= 0
                    ? 'linear-gradient(90deg, #00f5ff, #f58220)'
                    : '#ff2e63',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
              color: '#aaa',
              marginTop: 4,
            }}
          >
            <span>${fmt(totalGroupSpendingForBudget)} spent</span>
            <span>${fmt(currentGroup.budget)} budget</span>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 style={{ marginBottom: '1rem', color: COLORS.accent }}>
            Add Expense
          </h3>
          <form onSubmit={addExpense}>
            <Input
              id="desc-input"
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div
              style={{
                display: 'flex',
                gap: 'clamp(0.5rem, 3vw, 1rem)',
                margin: '1rem 0',
                flexWrap: 'wrap',
              }}
            >
              <Input
                placeholder="Amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Select value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                checked={personal}
                onChange={(e) => setPersonal(e.target.checked)}
              />
              Personal expense
            </label>

            {!personal && (
              <>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={paidByGroupBudget}
                    onChange={(e) => setPaidByGroupBudget(e.target.checked)}
                  />
                  <span style={{ color: COLORS.accent }}>
                    Paid by Group Budget (split equally)
                  </span>
                </label>

                {!paidByGroupBudget && (
                  <>
                    <h4 style={{ marginBottom: 8, color: COLORS.accent }}>
                      Who paid?
                    </h4>
                    {payers.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginBottom: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Select
                          value={p.id}
                          onChange={(e) =>
                            setPayers(
                              payers.map((x, idx) =>
                                idx === i ? { ...x, id: e.target.value } : x
                              )
                            )
                          }
                        >
                          <option value="">Select member</option>
                          {currentGroup.members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </Select>
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={p.amount}
                          onChange={(e) =>
                            setPayers(
                              payers.map((x, idx) =>
                                idx === i ? { ...x, amount: e.target.value } : x
                              )
                            )
                          }
                        />
                        {payers.length > 1 && (
                          <Button
                            small
                            danger
                            onClick={() =>
                              setPayers(payers.filter((_, idx) => idx !== i))
                            }
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      onClick={() =>
                        setPayers([...payers, { id: '', amount: '0' }])
                      }
                    >
                      + Add Payer
                    </Button>

                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ marginBottom: 8, color: COLORS.accent }}>
                        Who is sharing this expense?
                      </h4>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: 8,
                        }}
                      >
                        {currentGroup.members.map((member) => (
                          <label
                            key={member.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 10px',
                              borderRadius: 6,
                              background: participantIds.includes(member.id)
                                ? 'rgba(0,245,255,0.1)'
                                : 'rgba(255,255,255,0.03)',
                              border: participantIds.includes(member.id)
                                ? '1px solid rgba(0,245,255,0.3)'
                                : '1px solid rgba(255,255,255,0.1)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={participantIds.includes(member.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setParticipantIds([
                                    ...participantIds,
                                    member.id,
                                  ]);
                                } else {
                                  setParticipantIds(
                                    participantIds.filter(
                                      (id) => id !== member.id
                                    )
                                  );
                                }
                              }}
                            />
                            <span style={{ fontSize: 13 }}>{member.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <Button
              type="submit"
              style={{
                width: '100%',
                marginTop: '1rem',
                background: COLORS.accent,
                boxShadow: '0 0 10px rgba(0,245,255,0.4)',
              }}
            >
              Add Expense
            </Button>
          </form>
        </GlassCard>

        <GlassCard>
          <Flex
            between
            style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}
          >
            <h3 style={{ color: COLORS.accent }}>Recent Expenses</h3>
            <Button
              small
              onClick={archiveGroup}
              style={{
                background: COLORS.accent,
                minWidth: '44px',
                minHeight: '44px',
              }}
            >
              Archive Group
            </Button>
          </Flex>
          <ExpenseList
            expenses={currentGroup.expenses}
            onDelete={deleteExpense}
            participantIds={currentGroup.members}
          />
        </GlassCard>

        {currentGroup.completed && (
          <GlassCard>
            <Flex
              between
              style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}
            >
              <h3 style={{ margin: 0, color: COLORS.accent }}>
                Final Settlement
              </h3>
              <Button
                onClick={() =>
                  openPrintSummary(
                    currentGroup,
                    balances,
                    totalGroupSpendingForBudget
                  )
                }
                style={{ background: COLORS.accent }}
              >
                Print Summary
              </Button>
            </Flex>
            <div>
              {currentGroup.members.map((m) => {
                const bal = balances[m.id] || 0;
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {m.name}{' '}
                    <span
                      style={{ color: bal >= 0 ? COLORS.accent : '#ff2e63' }}
                    >
                      {bal > 0 ? 'collects' : 'pays'} ${fmt(Math.abs(bal))}
                    </span>{' '}
                    {bal > 0 ? 'from' : 'into'} Group Budget
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Members Drawer */}
        {showMembersDrawer && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100%',
              width: 'clamp(280px, 80vw, 360px)',
              maxWidth: '90vw',
              background: COLORS.bg,
              borderLeft: '1px solid rgba(255,255,255,0.2)',
              padding: 'clamp(1rem, 5vw, 2rem)',
              overflowY: 'auto',
              zIndex: 200,
              boxShadow: '-15px 0 50px rgba(0,0,0,0.5)',
            }}
          >
            <Flex between style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: COLORS.accent }}>Group Members</h2>
              <Button
                onClick={() => setShowMembersDrawer(false)}
                style={{ background: COLORS.accent }}
              >
                ×
              </Button>
            </Flex>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newMemberName.trim()) return;
                const newMember = { id: uid(), name: newMemberName.trim() };
                setGroups((prev) =>
                  prev.map((g) =>
                    g.id === currentGroupId
                      ? { ...g, members: [...g.members, newMember] }
                      : g
                  )
                );
                setNewMemberName('');
              }}
            >
              <Flex gap="0.5rem" style={{ marginBottom: '1.5rem' }}>
                <Input
                  placeholder="Add member"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button type="submit" style={{ background: COLORS.accent }}>
                  Add
                </Button>
              </Flex>
            </form>

            {currentGroup.members.map((m) => (
              <div
                key={m.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderLeft: `4px solid ${COLORS.accent}`,
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  borderRadius: 8,
                }}
              >
                <Flex between>
                  <div>
                    {editingName === m.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveName(m.id);
                        }}
                      >
                        <Input
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onBlur={() => saveName(m.id)}
                          onKeyDown={(e) => e.key === 'Enter' && saveName(m.id)}
                          autoFocus
                          style={{ width: 'clamp(100px, 30vw, 150px)' }}
                        />
                      </form>
                    ) : (
                      <span
                        onClick={() => startEditName(m)}
                        style={{
                          fontWeight: 600,
                          color: COLORS.accent,
                          cursor: 'pointer',
                        }}
                      >
                        {m.name}
                      </span>
                    )}
                  </div>
                  <Button
                    small
                    danger
                    onClick={() => removeMember(m.id)}
                    disabled={currentGroup.members.length === 1}
                    style={{ padding: '4px 8px' }}
                  >
                    ✕
                  </Button>
                </Flex>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Drawer */}
        {showDrawer && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100%',
              width: 'clamp(300px, 80vw, 420px)',
              maxWidth: '90vw',
              background: COLORS.bg,
              borderLeft: '1px solid rgba(255,255,255,0.2)',
              padding: 'clamp(1rem, 5vw, 2rem)',
              overflowY: 'auto',
              zIndex: 200,
              boxShadow: '-15px 0 50px rgba(0,0,0,0.5)',
            }}
          >
            <Dashboard
              currentGroup={currentGroup}
              balances={balances}
              yourTotalPaid={yourTotalPaid}
              totalGroupSpendingForBudget={totalGroupSpendingForBudget}
              remainingBudget={remainingBudget}
              onClose={() => setShowDrawer(false)}
              onArchive={archiveGroup}
              onDelete={() => {
                setShowDrawer(false);
                setShowConfirmDelete(true);
              }}
            />
          </div>
        )}

        {/* Confirmation Modals */}
        {showConfirmRemoveMember && (
          <Modal onClose={() => setShowConfirmRemoveMember(null)}>
            <h2 style={{ marginBottom: '1rem', color: COLORS.danger }}>
              Remove Member
            </h2>
            <p style={{ color: '#aaa', marginBottom: '1rem' }}>
              Are you sure you want to remove this member?
            </p>
            <Flex gap="0.5rem">
              <Button danger onClick={confirmRemoveMember}>
                Remove
              </Button>
              <Button onClick={() => setShowConfirmRemoveMember(null)}>
                Cancel
              </Button>
            </Flex>
          </Modal>
        )}

        {showAddMember && (
          <Modal onClose={() => setShowAddMember(false)}>
            <h2 style={{ marginBottom: '1rem' }}>Add Member</h2>
            <form onSubmit={addMember}>
              <Input
                placeholder="Member name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                autoFocus
              />
              <Flex gap="0.5rem" style={{ marginTop: '1rem' }}>
                <Button type="submit" style={{ background: COLORS.accent }}>
                  Add
                </Button>
                <Button danger onClick={() => setShowAddMember(false)}>
                  Cancel
                </Button>
              </Flex>
            </form>
          </Modal>
        )}

        {showConfirmDelete && (
          <Modal onClose={() => setShowConfirmDelete(false)}>
            <h2 style={{ marginBottom: '1rem', color: COLORS.danger }}>
              Delete Group
            </h2>
            <p style={{ color: '#aaa', marginBottom: '1rem' }}>
              Permanently delete "{currentGroup.name}"?
            </p>
            <Flex gap="0.5rem">
              <Button danger onClick={deleteGroup}>
                Delete
              </Button>
              <Button onClick={() => setShowConfirmDelete(false)}>
                Cancel
              </Button>
            </Flex>
          </Modal>
        )}
      </Container>
    </div>
  );
}

/* ----------  SUB-COMPONENTS  ---------- */
const ExpenseList = ({ expenses, onDelete, participantIds }) => {
  const [filter, setFilter] = useState('All');
  const filtered =
    filter === 'All' ? expenses : expenses.filter((e) => e.category === filter);

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
        }}
      >
        {['All', ...CATEGORIES.map((c) => c.name)].map((f) => (
          <Button
            key={f}
            small
            style={{
              background: filter === f ? COLORS.accent : 'transparent',
              color: filter === f ? '#0f0f23' : COLORS.text,
              border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.2)',
            }}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '1rem 0' }}>
          No expenses
        </p>
      )}

      {filtered.map((ex) => {
        const participants = ex.participantIds
          .map(
            (id) => participantIds.find((m) => m.id === id)?.name || 'Member'
          )
          .join(', ');
        return (
          <div
            key={ex.id}
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderLeft: `4px solid ${
                CATEGORIES.find((c) => c.name === ex.category)?.color ||
                '#dfe4ea'
              }`,
              padding: 'clamp(0.75rem, 3vw, 1rem)',
              marginBottom: '0.5rem',
              borderRadius: 8,
            }}
          >
            <Flex between style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{ex.description}</div>
                <small style={{ color: '#aaa' }}>
                  {CATEGORIES.find((c) => c.name === ex.category)?.icon}{' '}
                  {ex.category} • {ex.isPersonal ? 'Personal' : 'Group'}
                </small>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                  Shared by: {participants}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: COLORS.accent }}>
                  ${fmt(ex.amount)}
                </div>
                <Button small onClick={() => onDelete(ex.id)}>
                  Delete
                </Button>
              </div>
            </Flex>
          </div>
        );
      })}
    </>
  );
};

const Dashboard = ({
  currentGroup,
  balances,
  yourTotalPaid,
  totalGroupSpendingForBudget,
  remainingBudget,
  onClose,
  onArchive,
  onDelete,
}) => {
  const expensesByCategory = currentGroup.expenses.reduce((acc, ex) => {
    if (ex.isPersonal) return acc;
    acc[ex.category] = (acc[ex.category] || 0) + ex.amount;
    return acc;
  }, {});

  return (
    <>
      <Flex between style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: COLORS.accent }}>Dashboard</h2>
        <Button onClick={onClose} style={{ background: COLORS.accent }}>
          ×
        </Button>
      </Flex>

      <GlassCard>
        <h3 style={{ marginBottom: 8 }}>Budget Status</h3>
        <div
          style={{
            fontSize: 'clamp(1.5rem, 6vw, 2.5rem)',
            fontWeight: 700,
            color: remainingBudget >= 0 ? COLORS.remaining : '#ff2e63',
          }}
        >
          ${fmt(remainingBudget)}
        </div>
        <small style={{ color: '#aaa' }}>
          remaining of ${fmt(currentGroup.budget)} budget
        </small>
      </GlassCard>

      <GlassCard>
        <h3 style={{ marginBottom: 8 }}>Your Financials</h3>
        <Flex between>
          <span>Your Total Paid</span>
          <span>${fmt(yourTotalPaid)}</span>
        </Flex>
      </GlassCard>

      <GlassCard>
        <h3 style={{ marginBottom: 8 }}>By Category</h3>
        {Object.entries(expensesByCategory).length > 0 ? (
          Object.entries(expensesByCategory).map(([cat, amt]) => {
            const pct = (amt / totalGroupSpendingForBudget) * 100;
            const color = CATEGORIES.find((c) => c.name === cat)?.color;
            return (
              <div key={cat} style={{ marginBottom: 8 }}>
                <Flex between>
                  <span>{cat}</span>
                  <span>${fmt(amt)}</span>
                </Flex>
                <div
                  style={{
                    height: 6,
                    background: 'rgba(255,255,255,.1)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, pct)}%`,
                      background: color,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ color: '#aaa', fontSize: 14 }}>
            No category expenses
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 style={{ marginBottom: 8 }}>Member Balances</h3>
        {currentGroup.members.map((m) => {
          const bal = balances[m.id] || 0;
          return (
            <Flex
              between
              key={m.id}
              style={{ marginBottom: 4, padding: '4px 0' }}
            >
              <span>{m.name}</span>
              <span style={{ color: bal >= 0 ? COLORS.accent : '#ff2e63' }}>
                ${fmt(bal)}
              </span>
            </Flex>
          );
        })}
      </GlassCard>

      <div style={{ marginTop: '1.5rem' }}>
        <Button
          onClick={onArchive}
          style={{
            width: '100%',
            background: COLORS.accent,
            marginBottom: '0.75rem',
            boxShadow: '0 0 10px rgba(0,245,255,0.4)',
          }}
        >
          Archive Group
        </Button>
        <Button
          onClick={onDelete}
          danger
          style={{
            width: '100%',
            background: COLORS.danger,
            boxShadow: '0 0 10px rgba(232,67,147,0.4)',
          }}
        >
          Delete Group
        </Button>
      </div>
    </>
  );
};

/* ----------  PRIMITIVE COMPONENTS  ---------- */
const Button = ({ children, small, danger, ...props }) => (
  <button
    style={{
      background: danger ? COLORS.danger : COLORS.accent,
      color: danger ? '#fff' : '#0f0f23',
      fontSize: small ? '0.875rem' : '1rem',
      fontWeight: 600,
      padding: small ? '0.75rem 1rem' : '1rem 1.5rem',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 0 10px rgba(0,245,255,0.4)',
      minHeight: '44px',
      minWidth: '44px',
      ...props.style,
    }}
    onMouseEnter={(e) => {
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = '0 6px 20px rgba(0,245,255,0.5)';
    }}
    onMouseLeave={(e) => {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 0 10px rgba(0,245,255,0.4)';
    }}
    {...props}
  >
    {children}
  </button>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 8,
      padding: 'clamp(0.75rem, 3vw, 1rem)',
      color: COLORS.text,
      outline: 'none',
      width: '100%',
      minHeight: '44px',
      fontSize: '1rem',
      ...props.style,
    }}
  />
);

const Select = (props) => (
  <select
    {...props}
    style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 8,
      padding: 'clamp(0.75rem, 3vw, 1rem)',
      color: COLORS.text,
      width: '100%',
      minHeight: '44px',
      fontSize: '1rem',
      ...props.style,
    }}
  />
);

const Flex = ({ col, between, ...props }) => (
  <div
    {...props}
    style={{
      display: 'flex',
      flexDirection: col ? 'column' : 'row',
      justifyContent: between ? 'space-between' : 'flex-start',
      alignItems: 'center',
      gap: 'clamp(0.5rem, 3vw, 1rem)',
      ...props.style,
    }}
  />
);

const Container = ({ children }) => (
  <div
    style={{
      maxWidth: '900px',
      width: '100%',
      margin: '0 auto',
      padding: '0 0.5rem',
      boxSizing: 'border-box',
    }}
  >
    {children}
  </div>
);

const GlassCard = ({ children, style = {} }) => (
  <div
    style={{
      background: COLORS.glass,
      border: `1px solid ${COLORS.glassBorder}`,
      borderRadius: 16,
      padding: 'clamp(1rem, 5vw, 1.5rem)',
      marginBottom: 'clamp(1rem, 5vw, 1.5rem)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      borderImage:
        'linear-gradient(135deg, rgba(0,245,255,0.3), transparent) 1',
      ...style,
    }}
  >
    {children}
  </div>
);

const Modal = ({ children, onClose }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      backdropFilter: 'blur(4px)',
      padding: '1rem',
      boxSizing: 'border-box',
    }}
    onClick={onClose}
  >
    <div
      style={{
        width: 'clamp(280px, 90vw, 400px)',
        background: 'rgba(20,20,40,0.95)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 16,
        padding: 'clamp(1rem, 5vw, 2rem)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        borderImage:
          'linear-gradient(135deg, rgba(0,245,255,0.4), transparent) 1',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);
