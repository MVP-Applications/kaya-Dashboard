'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { emptyContact } from '@/lib/admin/content'
import ContactForm from './ContactForm'

export default function ContactsView() {
  const { contacts, countryRecords, upsertContact, deleteContact, allowed } = useAdmin()
  const [editing, setEditing] = useState(null) // { initial, isNew }
  const [confirm, setConfirm] = useState(null)
  const [query, setQuery] = useState('')

  const canCreate = allowed('create')
  const canDelete = allowed('delete')

  // Countries without a contact yet — the only ones offered when creating a new one.
  const availableCountries = countryRecords.filter(c => !contacts.some(k => k.countryId === c.id))

  if (editing) {
    return (
      <ContactForm
        initial={editing.initial}
        isNew={editing.isNew}
        availableCountries={availableCountries}
        onSave={(rec, orig) => { upsertContact(rec, orig); setEditing(null) }}
        onClose={() => setEditing(null)}
      />
    )
  }

  const q = query.trim().toLowerCase()
  const filtered = contacts.filter(c => (
    !q || `${c.countryName} ${c.countryCode} ${c.phoneNumber} ${c.whatsappNumber}`.toLowerCase().includes(q)
  ))

  const target = confirm ? contacts.find(c => c.id === confirm) : null

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Contacts</h1>
          <p className="ad-view-sub">
            Phone and WhatsApp numbers the website shows per country — one contact per country.
          </p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary"
            disabled={availableCountries.length === 0}
            title={availableCountries.length === 0 ? 'Every country already has a contact.' : undefined}
            onClick={() => setEditing({ initial: emptyContact(), isNew: true })}>
            + New contact
          </button>
        )}
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-input ad-search"
          placeholder="Search contacts…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Phone</th>
              <th>Secondary</th>
              <th>WhatsApp</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="ad-cell-name">{c.countryName}</div>
                  <div className="ad-cell-slug">{c.countryCode}</div>
                </td>
                <td>{c.phoneNumber}</td>
                <td>{c.secondaryPhoneNumber || '—'}</td>
                <td>{c.whatsappNumber || '—'}</td>
                <td className="ad-td-actions">
                  <button className="ad-btn ad-btn--soft ad-btn--sm"
                    onClick={() => setEditing({ initial: c, isNew: false })}>Edit</button>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(c.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="ad-empty">No contacts match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {target && (
        <div className="ad-drawer-scrim" onClick={() => setConfirm(null)}>
          <div className="ad-confirm" onClick={e => e.stopPropagation()}>
            <h3 className="ad-confirm-title">Delete contact?</h3>
            <p className="ad-confirm-text">
              The phone/WhatsApp numbers for <strong>{target.countryName}</strong> will be removed from the site.
            </p>
            <div className="ad-confirm-actions">
              <button className="ad-btn ad-btn--ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="ad-btn ad-btn--danger"
                onClick={() => { deleteContact(target.id); setConfirm(null) }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
