import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// VALIDATION DE LA LOGIQUE DU JEU (côté serveur)
// ============================================

function validIdx(i: unknown): boolean {
  return typeof i === 'number' && i >= 0 && i <= 24;
}

function isAdjacent(a: number, b: number): boolean {
  const ra = Math.floor(a / 5), ca = a % 5;
  const rb = Math.floor(b / 5), cb = b % 5;
  return (Math.abs(ra - rb) === 1 && ca === cb) || (ra === rb && Math.abs(ca - cb) === 1);
}

function validateMove(game: any, action: any, playerIdx: number): string | null {
  if (!game || !action) return "Données manquantes";
  if (game.phase === 'done') return "Partie terminée";

  // Phase bonus
  if (game.phase === 'bon') {
    if (action.type !== 'bon') return "Seule l'action bonus est autorisée";
    if (game.bon?.cp !== playerIdx) return "Ce n'est pas votre bonus";
    if (!validIdx(action.cell)) return "Case invalide";
    const piece = game.board[action.cell];
    if (!piece || piece.p === playerIdx) return "Cible bonus invalide";
    return null; // OK
  }

  if (game.phase !== 'play') return "Phase invalide";
  if (game.cur !== playerIdx) return "Ce n'est pas votre tour";

  if (action.type === 'place') {
    if (!validIdx(action.cell)) return "Case invalide";
    if (game.board[action.cell]) return "Case occupée";
    if (game.res[playerIdx] <= 0) return "Plus de pions en réserve";
    return null;
  }

  if (action.type === 'move') {
    if (!validIdx(action.from) || !validIdx(action.to)) return "Indices invalides";
    const piece = game.board[action.from];
    if (!piece || piece.p !== playerIdx) return "Pion invalide";
    if (game.board[action.to]) return "Case de destination occupée";
    if (!isAdjacent(action.from, action.to)) return "Mouvement non adjacent";
    if (game.res[playerIdx] > 0) return "Vous devez placer un pion, pas déplacer";
    return null;
  }

  if (action.type === 'cap') {
    if (!validIdx(action.from) || !validIdx(action.cap) || !validIdx(action.to)) return "Indices invalides";
    const attacker = game.board[action.from];
    const target = game.board[action.cap];
    if (!attacker || attacker.p !== playerIdx) return "Pion attaquant invalide";
    if (!target || target.p === playerIdx) return "Cible de capture invalide";
    if (game.board[action.to]) return "Case d'arrivée occupée";
    // Vérifier alignement : cap doit être exactement entre from et to
    const fr = Math.floor(action.from/5), fc = action.from%5;
    const cr = Math.floor(action.cap/5),  cc = action.cap%5;
    const tr = Math.floor(action.to/5),   tc = action.to%5;
    if (cr !== (fr+tr)/2 || cc !== (fc+tc)/2) return "Capture géométriquement invalide";
    if (fr!==tr && fc!==tc) return "Capture diagonale interdite";
    return null;
  }

  return "Type d'action inconnu";
}

// ============================================
// VALIDATION DU GAME STATE (anti-triche score)
// ============================================

function validateGameState(oldState: any, newState: any, playerIdx: number): string | null {
  if (!oldState || !newState) return null; // Premier état, on accepte

  const og = oldState.game, ng = newState.game;
  const os = oldState.ser, ns = newState.ser;

  if (!og || !ng || !os || !ns) return "Structure de données invalide";

  // Les scores ne peuvent QUE augmenter, jamais diminuer
  if (ns.scores[0] < os.scores[0]) return "Score P1 manipulé";
  if (ns.scores[1] < os.scores[1]) return "Score P2 manipulé";

  // Un score ne peut pas augmenter de plus de 7 points d'un coup (max = Ndar kepp)
  if (ns.scores[0] - os.scores[0] > 7) return "Gain de points impossible";
  if (ns.scores[1] - os.scores[1] > 7) return "Gain de points impossible";

  // Les réserves ne peuvent pas augmenter (on ne peut pas récupérer des pions)
  if (ng.res[0] > og.res[0] && og.phase !== 'done') return "Réserve P1 manipulée";
  if (ng.res[1] > og.res[1] && og.phase !== 'done') return "Réserve P2 manipulée";

  return null; // OK
}

// ============================================
// SERVEUR PRINCIPAL
// ============================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, userId, action, newGameState } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Récupérer la room et l'état actuel
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('host_id, guest_id, game_state')
      .eq('code', code)
      .single()

    if (fetchError || !room) {
      return new Response(
        JSON.stringify({ error: "Partie introuvable" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // 2. Vérifier l'identité
    if (userId !== room.host_id && userId !== room.guest_id) {
      return new Response(
        JSON.stringify({ error: "Non autorisé : vous n'êtes pas joueur de cette partie" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const playerIdx = userId === room.host_id ? 0 : 1;

    // 3. Valider le mouvement si fourni
    if (action) {
      const moveError = validateMove(room.game_state?.game, action, playerIdx);
      if (moveError) {
        console.warn(`Mouvement invalide (joueur ${playerIdx}) :`, moveError);
        return new Response(
          JSON.stringify({ error: `Mouvement invalide : ${moveError}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    // 4. Valider le nouveau state (anti-triche sur les scores)
    const stateError = validateGameState(room.game_state, newGameState, playerIdx);
    if (stateError) {
      console.warn(`State manipulé (joueur ${playerIdx}) :`, stateError);
      return new Response(
        JSON.stringify({ error: `État invalide : ${stateError}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 5. Tout est valide → écrire en base
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ game_state: newGameState })
      .eq('code', code)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, message: "Mouvement validé" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Erreur Edge Function :', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})