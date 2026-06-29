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
    const { geocodeAddress } = await import('@/lib/geocode')
    const coords = await geocodeAddress(customerForm.address)

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

    const devicePayload = []
    for (let i = 0; i < deviceForms.length; i++) {
      const d = deviceForms[i]

      // 납입의사록·패킹리스트 파일이 있으면 packing-lists(비공개) 버킷에 업로드.
      // DB에는 전체 URL이 아니라 "저장 경로(파일명)"만 보관 → 열 때 서명 URL 발급.
      let packingPath: string | null = null
      if (d.packing_file) {
        const ext = d.packing_file.name.split('.').pop()
        const fileName = `packing-${insertedCustomerId}-${i}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('packing-lists')
          .upload(fileName, d.packing_file, { upsert: true })
        if (!upErr) {
          packingPath = fileName
        }
      }

      devicePayload.push({
        customer_id: insertedCustomerId,
        device_name: d.device_name.trim(),
        device_name2: d.device_name2.trim() || null,
        option: d.option.trim() || null,
        serial_number: d.serial_number.trim() || null,
        program: d.program,
        install_date: d.install_date || null,
        category: d.category,
        packing_list_url: packingPath,
      })
    }

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