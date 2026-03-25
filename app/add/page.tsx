'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AddCustomerPage() {
  const [company, setCompany] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  const handleSubmit = async () => {
    const { error } = await supabase.from('customers').insert([
      {
        company_name: company,
        address: address,
        latitude: Number(lat),
        longitude: Number(lng),
      },
    ])

    if (error) {
      alert('실패')
      console.error(error)
    } else {
      alert('추가 완료')
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>업체 추가</h1>

      <input placeholder="회사명" onChange={(e) => setCompany(e.target.value)} />
      <br />
      <input placeholder="주소" onChange={(e) => setAddress(e.target.value)} />
      <br />
      <input placeholder="위도" onChange={(e) => setLat(e.target.value)} />
      <br />
      <input placeholder="경도" onChange={(e) => setLng(e.target.value)} />
      <br /><br />

      <button onClick={handleSubmit}>추가</button>
    </div>
  )
}