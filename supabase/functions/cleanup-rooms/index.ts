import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // La service_role key a tous les droits — elle ignore le RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Supprime toutes les rooms créées il y a plus de 2 heures
    // La colonne created_at est ajoutée automatiquement par Supabase
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('rooms')
      .delete()
      .lt('created_at', twoHoursAgo)
      .select('code') // pour savoir ce qui a été supprimé

    if (error) throw error

    const count = data?.length ?? 0
    console.log(`Nettoyage terminé : ${count} room(s) supprimée(s)`)

    return new Response(
      JSON.stringify({ success: true, deleted: count }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Erreur nettoyage :', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})