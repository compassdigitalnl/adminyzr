import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const Employees: CollectionConfig = {
  slug: 'employees',
  admin: {
    useAsTitle: 'firstName',
    defaultColumns: ['firstName', 'lastName', 'position', 'department', 'employmentType', 'isActive'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin'),
    update: hasRoleInTenant('owner', 'admin'),
    delete: hasRoleInTenant('owner', 'admin'),
  },
  hooks: {
    beforeValidate: [setOrganization],
    afterChange: [logAfterChange],
    afterDelete: [logAfterDelete],
  },
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Gekoppeld account',
      admin: { position: 'sidebar' },
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
      label: 'Voornaam',
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
      label: 'Achternaam',
    },
    {
      name: 'email',
      type: 'text',
      label: 'E-mail',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Telefoon',
    },
    {
      name: 'position',
      type: 'text',
      label: 'Functie',
    },
    {
      name: 'department',
      type: 'text',
      label: 'Afdeling',
    },
    {
      name: 'employmentType',
      type: 'select',
      label: 'Dienstverband',
      defaultValue: 'fulltime',
      options: [
        { label: 'Fulltime', value: 'fulltime' },
        { label: 'Parttime', value: 'parttime' },
        { label: 'Freelance', value: 'freelance' },
        { label: 'Stagiair', value: 'intern' },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      label: 'Startdatum',
    },
    {
      name: 'endDate',
      type: 'date',
      label: 'Einddatum',
    },
    {
      name: 'hoursPerWeek',
      type: 'number',
      label: 'Uren per week',
      admin: { description: 'Contractuele uren per week' },
    },
    {
      name: 'salary',
      type: 'number',
      label: 'Bruto maandsalaris',
      admin: { description: 'Bruto maandsalaris in centen' },
    },
    {
      name: 'bsn',
      type: 'text',
      label: 'BSN',
      admin: {
        hidden: true,
        description: 'Burgerservicenummer',
      },
    },
    {
      name: 'address',
      type: 'group',
      label: 'Adres',
      fields: [
        {
          name: 'street',
          type: 'text',
          label: 'Straat',
        },
        {
          name: 'houseNumber',
          type: 'text',
          label: 'Huisnummer',
        },
        {
          name: 'postalCode',
          type: 'text',
          label: 'Postcode',
        },
        {
          name: 'city',
          type: 'text',
          label: 'Plaats',
        },
        {
          name: 'country',
          type: 'text',
          label: 'Land',
          defaultValue: 'NL',
        },
      ],
    },
    {
      name: 'emergencyContact',
      type: 'group',
      label: 'Noodcontact',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Naam',
        },
        {
          name: 'phone',
          type: 'text',
          label: 'Telefoon',
        },
        {
          name: 'relation',
          type: 'text',
          label: 'Relatie',
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notities',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Actief',
      admin: { position: 'sidebar' },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
