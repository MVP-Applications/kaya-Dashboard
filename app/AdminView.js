'use client'
import Overview from '@/features/overview/components/Overview'
import ServicesView from '@/features/services/components/ServicesView'
import VerticalsView from '@/features/verticals/components/VerticalsView'
import CategoriesView from '@/features/categories/components/CategoriesView'
import DoctorsView from '@/features/doctors/components/DoctorsView'
import IndulgenceView from '@/features/indulgence/components/IndulgenceView'
import TellUsView from '@/features/tell-us/components/TellUsView'
import VoucherRequestsView from '@/features/voucher-requests/components/VoucherRequestsView'
import ReviewsView from '@/features/reviews/components/ReviewsView'
import CustomersView from '@/features/customers/components/CustomersView'
import RequestsView from '@/features/requests/components/RequestsView'
import PagesView from '@/features/pages/components/PagesView'
import LocationsView from '@/features/locations/components/LocationsView'
import CountriesView from '@/features/countries/components/CountriesView'
import ContactsView from '@/features/contacts/components/ContactsView'
import SiteView from '@/features/site/components/SiteView'
import UsersView from '@/features/users/components/UsersView'

const VIEWS = {
  overview: Overview,
  requests: RequestsView,
  'voucher-requests': VoucherRequestsView,
  customers: CustomersView,
  services: ServicesView,
  verticals: VerticalsView,
  categories: CategoriesView,
  'tell-us': TellUsView,
  doctors: DoctorsView,
  indulgence: IndulgenceView,
  reviews: ReviewsView,
  pages: PagesView,
  locations: LocationsView,
  countries: CountriesView,
  contacts: ContactsView,
  site: SiteView,
  users: UsersView,
}

/** The routed body of a section — see shared/lib/routes.js. */
export default function AdminView({ id }) {
  const View = VIEWS[id] || Overview
  return <View />
}
