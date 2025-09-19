import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

export default (keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions, desktop = true) => {
  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);

  useEffect(() => {
    // Don't filter if devices are not loaded yet
    if (!devices || Object.keys(devices).length === 0) {
      return;
    }

    // On mobile, do basic filtering but skip complex operations
    if (!desktop) {
      let filtered = Object.values(devices);
      
      // Only apply keyword search on mobile (most common use case)
      if (keyword) {
        const lowerCaseKeyword = keyword.toLowerCase();
        filtered = filtered.filter((device) => 
          [device.name, device.uniqueId, device.phone, device.model, device.contact]
            .some((s) => s && s.toLowerCase().includes(lowerCaseKeyword))
        );
      }
      
      setFilteredDevices(filtered);
      setFilteredPositions(Object.values(positions));
      return;
    }

    // Quick path for no filters - just return all devices
    if (!keyword && !filter.statuses.length && !filter.groups.length && !filterSort) {
      console.log('useFilter: No filters applied, returning all devices');
      const allDevices = Object.values(devices);
      setFilteredDevices(allDevices);
      setFilteredPositions(filterMap
        ? allDevices.map((device) => positions[device.id]).filter(Boolean)
        : Object.values(positions));
      return;
    }

    const deviceGroups = (device) => {
      const groupIds = [];
      let { groupId } = device;
      while (groupId) {
        groupIds.push(groupId);
        groupId = groups[groupId]?.groupId || 0;
      }
      return groupIds;
    };

    const filtered = Object.values(devices)
      .filter((device) => !filter.statuses.length || filter.statuses.includes(device.status))
      .filter((device) => !filter.groups.length || deviceGroups(device).some((id) => filter.groups.includes(id)))
      .filter((device) => {
        if (!keyword) return true;
        const lowerCaseKeyword = keyword.toLowerCase();
        return [device.name, device.uniqueId, device.phone, device.model, device.contact].some((s) => s && s.toLowerCase().includes(lowerCaseKeyword));
      });
    
    // Only sort if filterSort is specified
    if (filterSort) {
      switch (filterSort) {
        case 'name':
          filtered.sort((device1, device2) => device1.name.localeCompare(device2.name));
          break;
        case 'lastUpdate':
          filtered.sort((device1, device2) => {
            const time1 = device1.lastUpdate ? dayjs(device1.lastUpdate).valueOf() : 0;
            const time2 = device2.lastUpdate ? dayjs(device2.lastUpdate).valueOf() : 0;
            return time2 - time1;
          });
          break;
        default:
          break;
      }
    }
    
    console.log('useFilter: Filtering devices', { 
      totalDevices: Object.keys(devices).length, 
      filteredCount: filtered.length,
      keyword,
      filter 
    });
    
    setFilteredDevices(filtered);
    setFilteredPositions(filterMap
      ? filtered.map((device) => positions[device.id]).filter(Boolean)
      : Object.values(positions));
  }, [keyword, filter, filterSort, filterMap, groups, devices, positions, setFilteredDevices, setFilteredPositions, desktop]);
};
