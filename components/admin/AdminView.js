'use client'
import Overview from './Overview'
import ServicesView from './ServicesView'
import VerticalsView from './VerticalsView'
import CategoriesView from './CategoriesView'
import DoctorsView from './DoctorsView'
import IndulgenceView from './IndulgenceView'
import TellUsView from './TellUsView'
import VoucherRequestsView from './VoucherRequestsView'
import ReviewsView from './ReviewsView'
import CustomersView from './CustomersView'
import RequestsView from './RequestsView'
import PagesView from './PagesView'
import LocationsView from './LocationsView'
import CountriesView from './CountriesView'
import ContactsView from './ContactsView'
import SiteView from './SiteView'
import UsersView from './UsersView'

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

/** The routed body of a section — see lib/admin/routes.js. */
export default function AdminView({ id }) {
  const View = VIEWS[id] || Overview
  return <View />
}
