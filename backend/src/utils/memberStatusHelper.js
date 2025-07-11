function calculateMemberStatus(joinedAt, leavingDate) {
  // Kein Beitrittsdatum = Interessent/Inaktiv
  if (!joinedAt) {
    return 'inactive';
  }
  
  // Kein Kündigungsdatum = Aktiv
  if (!leavingDate) {
    return 'active';
  }
  
  // Kündigungsdatum vergleichen
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leaving = new Date(leavingDate);
  leaving.setHours(0, 0, 0, 0);
  
  return leaving >= today ? 'active' : 'inactive';
}

function addCalculatedFields(member) {
  const memberData = member.toJSON ? member.toJSON() : member;
  
  // Status berechnen
  memberData.calculatedStatus = calculateMemberStatus(
    memberData.joinedAt,
    memberData.membershipData?.leavingDate
  );
  
  // Zusätzliche Felder
  memberData.isInteressent = !memberData.joinedAt;
  memberData.isLeaving = memberData.membershipData?.leavingDate && 
                         new Date(memberData.membershipData.leavingDate) >= new Date();
  
  return memberData;
}

module.exports = {
  calculateMemberStatus,
  addCalculatedFields
};