"use client";

import { useMemo } from "react";
import { Country, State, City } from "country-state-city";
import { SelectMenu } from "@/components/ui/select-menu";
import { Field, inputClass } from "@/components/ui/modal";

export type AddressFormValue = {
  address: string;
  city: string;
  state: string;
  country: string; // full country name, e.g. "Nigeria" — matches buyer_address.country
  countryIso: string; // ISO2 — drives the state/city dropdowns
  stateIso: string;
  phone: string;
};

export const BLANK_ADDRESS: AddressFormValue = {
  address: "", city: "", state: "", country: "Nigeria", countryIso: "NG", stateIso: "", phone: "",
};

/** Country → State → City cascading dropdowns (country-state-city) + street
 *  address + phone. Shared by the checkout Details step's billing + shipping
 *  blocks. Controlled — the parent owns the value so "same as billing" can
 *  mirror it in one place. */
export function AddressFields({ value, onChange, idPrefix }: {
  value: AddressFormValue;
  onChange: (v: AddressFormValue) => void;
  idPrefix: string;
}) {
  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => (value.countryIso ? State.getStatesOfCountry(value.countryIso) : []), [value.countryIso]);
  const cities = useMemo(() => (value.countryIso && value.stateIso ? City.getCitiesOfState(value.countryIso, value.stateIso) : []), [value.countryIso, value.stateIso]);

  function setCountry(name: string) {
    const c = countries.find((c) => c.name === name);
    onChange({ ...value, country: name, countryIso: c?.isoCode ?? "", state: "", stateIso: "", city: "" });
  }
  function setState(name: string) {
    const s = states.find((s) => s.name === name);
    onChange({ ...value, state: name, stateIso: s?.isoCode ?? "", city: "" });
  }
  function setCity(name: string) {
    onChange({ ...value, city: name });
  }

  return (
    <div className="space-y-4">
      <Field label="Street address">
        <input
          className={inputClass}
          placeholder="12 Adeola Odeku Street, Victoria Island"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Country">
          <SelectMenu options={countries.map((c) => c.name)} value={value.country} placeholder="Select country" onChange={setCountry} />
        </Field>
        <Field label="State / Region">
          <SelectMenu options={states.map((s) => s.name)} value={value.state} placeholder={value.countryIso ? "Select state" : "Select country first"} onChange={setState} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          {cities.length > 0 ? (
            <SelectMenu options={cities.map((c) => c.name)} value={value.city} placeholder={value.stateIso ? "Select city" : "Select state first"} onChange={setCity} />
          ) : (
            <input className={inputClass} placeholder="City / town" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} />
          )}
        </Field>
        <Field label="Phone number">
          <input
            id={`${idPrefix}-phone`}
            className={inputClass}
            type="tel"
            placeholder="+234 801 234 5678"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

export function addressIsComplete(v: AddressFormValue): boolean {
  return !!(v.address.trim() && v.city.trim() && v.state.trim() && v.country.trim() && v.phone.trim());
}
