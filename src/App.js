/* SplitMate – World-Demo UI (single file, logic unchanged) */
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

/* ----------  PDF DOWNLOAD HELPER  ---------- */
const openPrintSummary = (group, balances, totalGroupSpendingForBudget) => {
  const html = `
    <!doctype html>
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
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this website to download the PDF');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
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
      <div className="app-root">
        <Container>
          <GlassCard>
            <h1 className="hero">SplitMate</h1>
            {activeGroups.length === 0 && (
              <EmptyState />
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
                  <h3 className="sub">Archived</h3>
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
              <h2>Create Group</h2>
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
              <h2 style={{ color: 'var(--c-danger)' }}>Delete Group</h2>
              <p>Permanently delete this archived group?</p>
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
        <style>{worldDemoCss}</style>
      </div>
    );
  }
  return (
    <div className="app-root">
      <Container>
        <GlassCard>
          <Flex between style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div className="breadcrumb" onClick={() => setCurrentGroupId(null)}>
                Groups &gt; {currentGroup.name}
              </div>
              <h1>{currentGroup.name}</h1>
              <p className="meta">
                {currentGroup.expenses.length} expense
                {currentGroup.expenses.length !== 1 ? 's' : ''}
                {currentGroup.completed && ' • Completed'}
              </p>
            </div>
            <Flex gap="0.5rem" style={{ flexWrap: 'wrap' }}>
              <Button onClick={() => setShowMembersDrawer(true)}>Members</Button>
              <Button onClick={toggleCompleted}>
                {currentGroup.completed ? 'Re-open' : 'Mark Completed'}
              </Button>
              <Button onClick={() => setShowDrawer(true)}>Dashboard</Button>
            </Flex>
          </Flex>
        </GlassCard>
        <GlassCard>
          <h3>Group Budget</h3>
          <div className="budget-row">
            <div className="budget-input">
              <Input
                type="number"
                placeholder="0"
                value={currentGroup.budget}
                onChange={(e) => saveBudget(e.target.value)}
              />
              <label>Total Budget</label>
            </div>
            <div className="budget-remaining">
              <div className={remainingBudget >= 0 ? 'positive' : 'negative'}>
                ${fmt(remainingBudget)}
              </div>
              <label>Remaining</label>
            </div>
          </div>
          <div className="progress-bar">
            <div
              style={{
                width: `${Math.min(
                  100,
                  (totalGroupSpendingForBudget /
                    Math.max(currentGroup.budget, 1)) *
                    100
                )}%`,
              }}
            />
          </div>
          <Flex between className="progress-labels">
            <span>${fmt(totalGroupSpendingForBudget)} spent</span>
            <span>${fmt(currentGroup.budget)} budget</span>
          </Flex>
        </GlassCard>
        <GlassCard>
          <h3>Add Expense</h3>
          <form onSubmit={addExpense}>
            <Input
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="inline-row">
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
            <label className="checkbox">
              <input
                type="checkbox"
                checked={personal}
                onChange={(e) => setPersonal(e.target.checked)}
              />
              Personal expense
            </label>
            {!personal && (
              <>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={paidByGroupBudget}
                    onChange={(e) => setPaidByGroupBudget(e.target.checked)}
                  />
                  Paid by Group Budget (split equally)
                </label>
                {!paidByGroupBudget && (
                  <>
                    <h4>Who paid?</h4>
                    {payers.map((p, i) => (
                      <div className="payer-row" key={i}>
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
                      <h4>Who is sharing this expense?</h4>
                      <div className="participant-grid">
                        {currentGroup.members.map((member) => (
                          <label
                            key={member.id}
                            className={
                              participantIds.includes(member.id) ? 'checked' : ''
                            }
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
                            {member.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
            <Button type="submit" className="full">
              Add Expense
            </Button>
          </form>
        </GlassCard>
        <GlassCard>
          <Flex between style={{ marginBottom: '1rem' }}>
            <h3>Recent Expenses</h3>
            <Button small onClick={archiveGroup}>
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
            <Flex between>
              <h3>Final Settlement</h3>
              <Button
                onClick={() =>
                  openPrintSummary(
                    currentGroup,
                    balances,
                    totalGroupSpendingForBudget
                  )
                }
              >
                Download PDF
              </Button>
            </Flex>
            <div className="settle-list">
              {currentGroup.members.map((m) => {
                const bal = balances[m.id] || 0;
                return (
                  <div key={m.id} className="settle-item">
                    {m.name}{' '}
                    <span className={bal >= 0 ? 'collect' : 'pay'}>
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
          <div className="drawer">
            <div className="drawer-header">
              <h2>Group Members</h2>
              <Button onClick={() => setShowMembersDrawer(false)}>×</Button>
            </div>
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
                <Button type="submit">Add</Button>
              </Flex>
            </form>
            {currentGroup.members.map((m) => (
              <div className="member-card" key={m.id}>
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
                          autoFocus
                        />
                      </form>
                    ) : (
                      <span onClick={() => startEditName(m)}>{m.name}</span>
                    )}
                  </div>
                  <Button
                    small
                    danger
                    onClick={() => removeMember(m.id)}
                    disabled={currentGroup.members.length === 1}
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
          <div className="drawer">
            <div className="drawer-header">
              <h2>Dashboard</h2>
              <Button onClick={() => setShowDrawer(false)}>×</Button>
            </div>
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
            <h2 style={{ color: 'var(--c-danger)' }}>Remove Member</h2>
            <p>Are you sure you want to remove this member?</p>
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
            <h2>Add Member</h2>
            <form onSubmit={addMember}>
              <Input
                placeholder="Member name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                autoFocus
              />
              <Flex gap="0.5rem" style={{ marginTop: '1rem' }}>
                <Button type="submit">Add</Button>
                <Button danger onClick={() => setShowAddMember(false)}>
                  Cancel
                </Button>
              </Flex>
            </form>
          </Modal>
        )}
        {showConfirmDelete && (
          <Modal onClose={() => setShowConfirmDelete(false)}>
            <h2 style={{ color: 'var(--c-danger)' }}>Delete Group</h2>
            <p>Permanently delete "{currentGroup.name}"?</p>
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
      <style>{worldDemoCss}</style>
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
      <div className="filter-chips">
        {['All', ...CATEGORIES.map((c) => c.name)].map((f) => (
          <Button
            key={f}
            small
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="empty">No expenses</p>
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
            className="expense-card"
            style={{
              borderLeftColor:
                CATEGORIES.find((c) => c.name === ex.category)?.color ||
                '#dfe4ea',
            }}
          >
            <Flex between>
              <div>
                <div className="title">{ex.description}</div>
                <small>
                  {CATEGORIES.find((c) => c.name === ex.category)?.icon}{' '}
                  {ex.category} • {ex.isPersonal ? 'Personal' : 'Group'}
                </small>
                <div className="shared">Shared by: {participants}</div>
              </div>
              <div className="amount">
                ${fmt(ex.amount)}
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
      <GlassCard>
        <h3>Budget Status</h3>
        <div className={remainingBudget >= 0 ? 'positive' : 'negative'}>
          ${fmt(remainingBudget)}
        </div>
        <small>remaining of ${fmt(currentGroup.budget)} budget</small>
      </GlassCard>
      <GlassCard>
        <h3>Your Financials</h3>
        <Flex between>
          <span>Your Total Paid</span>
          <span>${fmt(yourTotalPaid)}</span>
        </Flex>
      </GlassCard>
      <GlassCard>
        <h3>By Category</h3>
        {Object.entries(expensesByCategory).length > 0 ? (
          Object.entries(expensesByCategory).map(([cat, amt]) => {
            const pct = (amt / totalGroupSpendingForBudget) * 100;
            const color = CATEGORIES.find((c) => c.name === cat)?.color;
            return (
              <div key={cat} className="category-bar">
                <Flex between>
                  <span>{cat}</span>
                  <span>${fmt(amt)}</span>
                </Flex>
                <div className="progress-bar">
                  <div style={{ width: `${Math.min(100, pct)}%`, background: color }} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">No category expenses</div>
        )}
      </GlassCard>
      <GlassCard>
        <h3>Member Balances</h3>
        {currentGroup.members.map((m) => {
          const bal = balances[m.id] || 0;
          return (
            <Flex between key={m.id} className="balance-item">
              <span>{m.name}</span>
              <span className={bal >= 0 ? 'positive' : 'negative'}>
                ${fmt(bal)}
              </span>
            </Flex>
          );
        })}
      </GlassCard>
      <div style={{ marginTop: '1.5rem' }}>
        <Button onClick={onArchive} className="full">
          Archive Group
        </Button>
        <Button onClick={onDelete} danger className="full">
          Delete Group
        </Button>
      </div>
    </>
  );
};

/* ----------  PRIMITIVE COMPONENTS  ---------- */
const Button = ({ children, small, danger, ...props }) => (
  <button
    {...props}
    className={`btn ${small ? 'small' : ''} ${danger ? 'danger' : ''} ${
      props.className || ''
    }`}
  >
    {children}
  </button>
);
const Input = (props) => <input {...props} className={`input ${props.className || ''}`} />;
const Select = (props) => <select {...props} className={`select ${props.className || ''}`} />;
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
const Container = ({ children }) => <div className="container">{children}</div>;
const GlassCard = ({ children, style = {} }) => (
  <div className="glass-card" style={style}>
    {children}
  </div>
);
const Modal = ({ children, onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);
const EmptyState = () => (
  <div className="empty-state">
    <svg width="100" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="20" r="12" fill="#00fff0" fillOpacity=".3" />
      <circle cx="20" cy="40" r="10" fill="#ff007a" fillOpacity=".3" />
      <circle cx="44" cy="40" r="10" fill="#f58220" fillOpacity=".3" />
      <path
        d="M32 32c-4 4-8 8-12 8s-8-4-8-8 4-8 8-8h24c4 0 8 4 8 8s-4 8-8 8-8-4-12-8z"
        fill="currentColor"
        fillOpacity=".1"
      />
    </svg>
    <p>No groups yet. Create one to start!</p>
  </div>
);

/* ----------  WORLD-DEMO CSS  ---------- */
const worldDemoCss = `
:root {
  --c-bg: #050507;
  --c-surface-1: rgba(255 255 255 / .04);
  --c-surface-2: rgba(255 255 255 / .08);
  --c-border: rgba(255 255 255 / .12);
  --c-accent: #00fff0;
  --c-accent2: #ff007a;
  --c-success: #00ff88;
  --c-danger: #ff2e63;
  --c-text: #f2f2f7;
  --c-text2: #8e8e93;
  --font: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --blur: 20px;
  --radius: 24px;
  --shadow: 0 20px 60px rgba(0,0,0,.6);
  --ease: cubic-bezier(.4,0,.2,1);
  --duration: .4s;
}
* { box-sizing: border-box; }
body { margin: 0; }
.container { max-width: 900px; margin: 0 auto; padding: 0 1rem; }
.app-root {
  background: radial-gradient(ellipse at top, #0d1117 0%, var(--c-bg) 100%);
  min-height: 100vh;
  color: var(--c-text);
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
  padding: clamp(.75rem,4vw,1.5rem);
}
.hero {
  font-size: clamp(1.8rem,6vw,3rem);
  text-align: center;
  color: var(--c-accent);
  margin-bottom: 1rem;
}
.breadcrumb {
  font-size: .875rem;
  color: var(--c-accent);
  cursor: pointer;
  margin-bottom: .25rem;
}
.meta { color: var(--c-text2); font-size: .875rem; }
.sub { font-size: 1rem; color: var(--c-accent); margin-top: 1.5rem; }
.empty-state {
  text-align: center;
  padding: 2rem 0;
  color: var(--c-text2);
}
.empty-state svg { margin-bottom: 1rem; }
.glass-card {
  background: var(--c-surface-1);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  backdrop-filter: blur(var(--blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(180%);
  box-shadow: var(--shadow);
  transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease);
  padding: clamp(1rem,5vw,1.5rem);
  margin-bottom: clamp(1rem,5vw,1.5rem);
}
.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 28px 80px rgba(0,0,0,.75);
}
.btn {
  position: relative;
  background: linear-gradient(135deg, var(--c-accent), #00c2ff);
  color: #000;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  padding: .9rem 1.4rem;
  cursor: pointer;
  transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease);
  min-height: 44px;
  min-width: 44px;
}
.btn.small { padding: .5rem .75rem; font-size: .875rem; }
.btn.danger { background: linear-gradient(135deg, var(--c-danger), #ff4570); color: #fff; }
.btn::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,.25) 0%, transparent 70%);
  opacity: 0;
  transition: opacity var(--duration);
}
.btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 12px 32px rgba(0,255,240,.6);
}
.btn:hover::after { opacity: 1; }
.input, .select {
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  color: var(--c-text);
  padding: .9rem 1rem;
  font-size: 1rem;
  transition: border-color var(--duration), box-shadow var(--duration);
}
.input:focus, .select:focus {
  border-color: var(--c-accent);
  outline: none;
  box-shadow: 0 0 0 3px rgba(0,255,240,.25);
}
.full { width: 100%; margin-top: 1rem; }
.checkbox {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin: .5rem 0;
}
.inline-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.budget-row {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  align-items: center;
}
.budget-input, .budget-remaining {
  flex: 1 1 200px;
}
.budget-input label, .budget-remaining label {
  display: block;
  font-size: .875rem;
  color: var(--c-text2);
  margin-top: 4px;
  text-align: center;
}
.positive { color: var(--c-success); }
.negative { color: var(--c-danger); }
.progress-bar {
  height: 6px;
  background: var(--c-surface-2);
  border-radius: 3px;
  overflow: hidden;
  margin: 1rem 0 4px;
}
.progress-bar > div {
  height: 100%;
  background: linear-gradient(90deg, var(--c-accent), var(--c-accent2));
  transition: width .5s ease;
}
.progress-labels {
  font-size: .875rem;
  color: var(--c-text2);
}
.filter-chips {
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
  margin-bottom: .75rem;
}
.filter-chips .btn {
  background: transparent;
  color: var(--c-text);
  border: 1px solid var(--c-border);
}
.filter-chips .btn.active {
  background: var(--c-accent);
  color: #000;
  border-color: var(--c-accent);
}
.empty { text-align: center; color: var(--c-text2); padding: 1rem 0; }
.expense-card {
  background: var(--c-surface-1);
  border: 1px solid var(--c-border);
  border-left-width: 4px;
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: .5rem;
  transition: transform var(--duration);
}
.expense-card:hover { transform: translateX(4px); }
.expense-card .title { font-weight: 600; }
.expense-card .shared { font-size: 12px; color: var(--c-text2); margin-top: 4px; }
.expense-card .amount { text-align: right; font-weight: 700; color: var(--c-accent); }
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: clamp(280px, 80vw, 360px);
  max-width: 90vw;
  background: rgba(5 5 7 / .75);
  backdrop-filter: blur(20px);
  border-left: 1px solid var(--c-border);
  padding: clamp(1rem,5vw,2rem);
  overflow-y: auto;
  z-index: 200;
  box-shadow: -15px 0 50px rgba(0,0,0,.5);
}
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--c-border);
  padding-bottom: 1rem;
}
.member-card {
  background: var(--c-surface-1);
  border-left: 4px solid var(--c-accent);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: .75rem;
}
.settle-list .settle-item {
  padding: .5rem 0;
  border-bottom: 1px solid var(--c-border);
}
.settle-item .collect { color: var(--c-success); }
.settle-item .pay { color: var(--c-danger); }
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
  padding: 1rem;
}
.modal {
  width: clamp(280px,90vw,400px);
  background: rgba(20,20,40,.95);
  border: 1px solid var(--c-border);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(12px);
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
}
.participant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(120px,1fr));
  gap: 8px;
}
.participant-grid label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
}
.participant-grid label.checked {
  background: rgba(0,255,240,.1);
  border-color: var(--c-accent);
}
.category-bar { margin-bottom: 8px; }
`;

/* ----------  END  ---------- */
