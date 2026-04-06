import { createClient } from '@/lib/supabase/client'
import { createEmptyDeviceForm } from '@/lib/home'

export const addCustomer = async ({
  customerForm,
  contactForm,
  deviceForms,
  fetchData,
  resetForms,
  setIsSavingCustomer,
  setIsAddCustomerModalOpen,
  setQuery,
}: any) => {
  const supabase = createClient()

  if (!customerForm.company_name.trim()) {
    alert('업체명을 입력해주세요.')
    return
  }

  if (!customerForm.address.trim()) {
    alert('주소를 입력해주세요.')
    return
  }

  if (!contactForm.name.trim()) {
    alert('담당자 이름을 입력해주세요.')
    return
  }

  if (deviceForms.length === 0) {
    alert('장비 정보를 최소 1개 입력해주세요.')
    return
  }

  for (const device of deviceForms) {
    if (!device.device_name.trim()) {
      alert('장비 라인업을 입력해주세요.')
      return
    }
  }

  setIsSavingCustomer(true)

  let insertedCustomerId = 0

  try {
    const { loadKakaoMap } = await import('@/lib/loadKakaoMap')
    const kakao = await loadKakaoMap()

    const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      const geocoder = new kakao.maps.services.Geocoder()

      geocoder.addressSearch(customerForm.address, (result: any[], status: string) => {
        if (status !== kakao.maps.services.Status.OK || !result[0]) {
          reject(new Error('주소 좌표 변환 실패'))
          return
        }

        resolve({
          latitude: Number(result[0].y),
          longitude: Number(result[0].x),
        })
      })
    })

    const { data: insertedCustomer, error: customerError } = await supabase
      .from('customers')
      .insert([
        {
          company_name: customerForm.company_name.trim(),
          address: customerForm.address.trim(),
          agency: customerForm.agency.trim() || null,
          status: customerForm.status,
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      ])
      .select('customer_id')
      .single()

    if (customerError || !insertedCustomer) {
      throw customerError || new Error('customers 저장 실패')
    }

    insertedCustomerId = insertedCustomer.customer_id

    const devicePayload = deviceForms.map((d: any) => ({
      customer_id: insertedCustomerId,
      device_name: d.device_name.trim(),
      device_name2: d.device_name2.trim() || null,
      option: d.option.trim() || null,
      serial_number: d.serial_number.trim() || null,
      program: d.program,
      install_date: d.install_date || null,
      install_engineer: d.install_engineer.trim() || null,
      category: d.category,
      packing_list_url: null,
    }))

    const { error: deviceError } = await supabase.from('devices').insert(devicePayload)
    if (deviceError) throw deviceError

    const { error: contactError } = await supabase.from('contacts').insert([
      {
        customer_id: insertedCustomerId,
        name: contactForm.name.trim(),
        department: contactForm.department.trim() || null,
        position: contactForm.position.trim() || null,
        phone: contactForm.phone.trim() || null,
      },
    ])
    if (contactError) throw contactError

    alert('업체가 추가되었습니다.')

    resetForms()
    setIsAddCustomerModalOpen(false)
    setQuery('')

    await fetchData()
  } catch (error: any) {
    console.error(error)

    if (insertedCustomerId) {
      await supabase.from('customers').delete().eq('customer_id', insertedCustomerId)
    }

    alert(error?.message || '에러 발생')
  } finally {
    setIsSavingCustomer(false)
  }
}