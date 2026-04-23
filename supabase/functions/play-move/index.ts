import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration pour autoriser les navigateurs à parler à cette fonction (CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Le videur laisse passer les vérifications de sécurité des navigateurs (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Le Videur écoute la demande du joueur
    const { code, userId, newGameState } = await req.json()

    // 2. Le Videur sort sa "Clé Passe-Partout" (Service Role Key)
    // Contrairement au HTML, ici la clé est cachée de manière 100% sécurisée dans le serveur
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. Le Videur regarde dans le registre (la base de données) pour cette partie
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('host_id, guest_id')
      .eq('code', code)
      .single()

    if (fetchError || !room) throw new Error("Partie introuvable.")

    // 4. L'INSPECTION : Est-ce que ce joueur a le droit de jouer ?
    if (userId !== room.host_id && userId !== room.guest_id) {
      // COUP DE PIED DU VIDEUR !
      return new Response(
        JSON.stringify({ error: "Triche détectée : Tu n'es pas un joueur de cette partie !" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 } // 403 = Interdit
      )
    }

    // 5. Si c'est un vrai joueur, le Videur met à jour le plateau lui-même
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ game_state: newGameState })
      .eq('code', code)

    if (updateError) throw updateError

    // 6. Le Videur dit au joueur que tout s'est bien passé
    return new Response(
      JSON.stringify({ success: true, message: "Mouvement validé par le serveur." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})