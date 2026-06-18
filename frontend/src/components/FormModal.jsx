/**
 * Generic form modal used by ProviderDashboard.
 * Handles overlay click-outside, title, error banner, save/cancel buttons, saving state.
 *
 * Usage:
 *   <FormModal title="Modifier le service" onClose={...}>
 *     <input ... />
 *   </FormModal>
 *
 * @param {string} title — Modal title
 * @param {ReactNode} children — Form fields
 * @param {Function} onSave — Called when save is clicked
 * @param {Function} onClose — Called when overlay or cancel is clicked
 * @param {boolean} saving — Show save spinner / disable button
 * @param {string} error — Optional error message to display
 */
export default function FormModal({ title, subtitle = '', children, onSave, onClose, saving = false, error = '', saveLabel = 'Enregistrer', footerExtra = null }) {
   return (
     <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
       <div className="modal space-y-3">
         <h3 className="font-bold">{title}</h3>
         {subtitle && <p className="text-sm text-muted">{subtitle}</p>}

         {error && <div className="alert alert-warning">{error}</div>}

         <div className="space-y-3">{children}</div>

         <div className="flex gap-2">
           <button className="btn btn-primary flex-1" onClick={onSave} disabled={saving}>
             {saving ? 'Enregistrement...' : saveLabel}
           </button>
           <button className="btn btn-ghost flex-1" onClick={onClose}>Annuler</button>
         </div>
         {footerExtra}
       </div>
     </div>
   )
 }
