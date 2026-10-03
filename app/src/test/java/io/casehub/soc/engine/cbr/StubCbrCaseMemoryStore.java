package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.EraseRequest;
import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.cbr.*;
import io.casehub.platform.api.path.Path;

import java.util.List;

public class StubCbrCaseMemoryStore implements CbrRecordStore {
    @Override public void registerSchema(CbrRecordSchema schema) {}
    @Override public String store(CbrRecord c, String t, String e, MemoryDomain d, String tid, String cid, Path s) { return cid; }
    @Override public <C extends CbrRecord> List<CbrMatch<C>> retrieveSimilar(CbrQuery q, Class<C> t) { return List.of(); }
    @Override public List<String> findCaseIds(MemoryDomain d, String t, java.util.Map<String, CbrFilter> f, String tid) { return List.of(); }
    @Override public int erase(EraseRequest r) { return 0; }
    @Override public int eraseEntity(String e, String t) { return 0; }
    @Override public int eraseByScope(Path s, String t) { return 0; }
    @Override public void recordOutcome(String c, CbrOutcome o, String t) {}
    @Override public int purge(CbrRetentionPolicy p) { return 0; }
    @Override public boolean supersede(String c, String sc, String r, String t) { return true; }
    @Override public boolean reinstate(String c, String t) { return true; }
    @Override public SupersessionStatus getSupersessionStatus(String c, String t) { return null; }
    @Override public List<SupersessionStatus> findSupersededCases(MemoryDomain d, String t) { return List.of(); }
    @Override public int supersedeMatching(MemoryDomain d, String ct, java.util.Map<String, CbrFilter> f, String r, String t) { return 0; }
    @Override public int supersedeAll(java.util.Collection<String> c, String r, String t) { return 0; }
    @Override public int reinstateMatching(MemoryDomain d, String ct, java.util.Map<String, CbrFilter> f, String t) { return 0; }
    @Override public int reinstateAll(java.util.Collection<String> c, String t) { return 0; }
}
